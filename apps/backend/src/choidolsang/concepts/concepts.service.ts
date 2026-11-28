import { Injectable, NotFoundException } from '@nestjs/common';
import { DEFAULT_PAGE_SIZE, type Pagination, toPagination } from '../../common/page-size';
import type { ChoidolsangConcept, Prisma } from '../../generated/prisma/client';
// biome-ignore lint/style/useImportType: NestJS needs the runtime value for dependency injection metadata.
import { PrismaService } from '../../prisma/prisma.service';
import type { ConceptDto, ConceptSearchField, ListConceptsQueryDto } from './dto/concept.dto';

export type Concept = {
  id: string;
  name: string;
  /** 구성품 목록 (추가한 순서) */
  components: string[];
  /** 가격 (원) */
  price: number;
  createdAt: string;
  updatedAt: string;
};

/** 다른 화면에서 컨셉을 고를 때 쓰는 짧은 항목 */
export type ConceptOption = {
  id: string;
  name: string;
  price: number;
};

export type ConceptListResponse = {
  items: Concept[];
  pagination: Pagination;
};

// 숨김 삭제한 컨셉은 어디서도 보이지 않는다.
const NOT_DELETED = { deletedAt: null } satisfies Prisma.ChoidolsangConceptWhereInput;

function toConcept(concept: ChoidolsangConcept): Concept {
  return {
    components: concept.components,
    createdAt: concept.createdAt.toISOString(),
    id: concept.id,
    name: concept.name,
    price: concept.price,
    updatedAt: concept.updatedAt.toISOString(),
  };
}

function toData(input: ConceptDto) {
  return { components: input.components ?? [], name: input.name, price: input.price };
}

function conceptNotFound() {
  return new NotFoundException('Concept not found');
}

@Injectable()
export class ChoidolsangConceptsService {
  constructor(private readonly prisma: PrismaService) {}

  async list({
    field = 'all',
    order = 'desc',
    page = 1,
    size = DEFAULT_PAGE_SIZE,
    q = '',
    sort = 'createdAt',
  }: ListConceptsQueryDto = {}): Promise<ConceptListResponse> {
    const where = {
      ...NOT_DELETED,
      ...(q ? await this.buildSearch(field, q) : {}),
    } satisfies Prisma.ChoidolsangConceptWhereInput;
    const [total, concepts] = await this.prisma.$transaction([
      this.prisma.choidolsangConcept.count({ where }),
      this.prisma.choidolsangConcept.findMany({
        // 같은 값끼리는 최근에 등록한 컨셉이 먼저 온다.
        orderBy:
          sort === 'createdAt'
            ? [{ createdAt: order }, { id: 'asc' }]
            : [{ [sort]: order }, { createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * size,
        take: size,
        where,
      }),
    ]);

    return {
      items: concepts.map(toConcept),
      pagination: toPagination(page, size, total),
    };
  }

  /**
   * 이름 또는 구성품으로 찾는다(부분 일치). 구성품은 문자열 배열이라 Prisma 조건으로 부분 일치를
   * 쓸 수 없어, 구성품이 맞는 컨셉 ID를 먼저 SQL로 찾는다.
   */
  private async buildSearch(
    field: ConceptSearchField,
    query: string,
  ): Promise<Prisma.ChoidolsangConceptWhereInput> {
    const byName = { name: { contains: query, mode: 'insensitive' as const } };

    if (field === 'name') {
      return byName;
    }

    // LIKE의 특수 문자(%, _, \)는 글자 그대로 찾도록 이스케이프한다.
    const pattern = `%${query.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "choidolsang"."concepts"
      WHERE "deletedAt" IS NULL AND array_to_string("components", E'\n') ILIKE ${pattern}
    `;
    const byComponents = { id: { in: rows.map((row) => row.id) } };

    // biome-ignore lint/style/useNamingConvention: Prisma filter operator.
    return field === 'components' ? byComponents : { OR: [byName, byComponents] };
  }

  /** 고를 수 있는(숨김 삭제되지 않은) 컨셉 전체를 이름순으로. 문의의 희망 컨셉 선택에 쓴다. */
  listOptions(): Promise<ConceptOption[]> {
    return this.prisma.choidolsangConcept.findMany({
      orderBy: [{ name: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, name: true, price: true },
      where: NOT_DELETED,
    });
  }

  async findById(id: string): Promise<Concept> {
    const concept = await this.prisma.choidolsangConcept.findFirst({
      where: { id, ...NOT_DELETED },
    });

    if (!concept) {
      throw conceptNotFound();
    }

    return toConcept(concept);
  }

  async create(input: ConceptDto): Promise<Concept> {
    return toConcept(await this.prisma.choidolsangConcept.create({ data: toData(input) }));
  }

  async update(id: string, input: ConceptDto): Promise<Concept> {
    const { count } = await this.prisma.choidolsangConcept.updateMany({
      data: toData(input),
      where: { id, ...NOT_DELETED },
    });

    if (count === 0) {
      throw conceptNotFound();
    }

    return this.findById(id);
  }

  /** 숨김 삭제한다. 나중에 문의·예약이 컨셉을 참조할 수 있어 행은 남긴다. */
  async remove(id: string): Promise<void> {
    const { count } = await this.prisma.choidolsangConcept.updateMany({
      data: { deletedAt: new Date() },
      where: { id, ...NOT_DELETED },
    });

    if (count === 0) {
      throw conceptNotFound();
    }
  }
}

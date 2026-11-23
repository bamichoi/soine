import { Injectable, NotFoundException } from '@nestjs/common';
import type { ChoidolsangConcept, Prisma } from '../../generated/prisma/client';
// biome-ignore lint/style/useImportType: NestJS needs the runtime value for dependency injection metadata.
import { PrismaService } from '../../prisma/prisma.service';
import type { ConceptDto, ListConceptsQueryDto } from './dto/concept.dto';

export const CONCEPT_PAGE_SIZE = 20;

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

export type ConceptListResponse = {
  items: Concept[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
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

  async list({ page = 1, q = '' }: ListConceptsQueryDto = {}): Promise<ConceptListResponse> {
    const where = {
      ...NOT_DELETED,
      ...(q ? { name: { contains: q, mode: 'insensitive' as const } } : {}),
    } satisfies Prisma.ChoidolsangConceptWhereInput;
    const [total, concepts] = await this.prisma.$transaction([
      this.prisma.choidolsangConcept.count({ where }),
      this.prisma.choidolsangConcept.findMany({
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * CONCEPT_PAGE_SIZE,
        take: CONCEPT_PAGE_SIZE,
        where,
      }),
    ]);

    return {
      items: concepts.map(toConcept),
      pagination: {
        page,
        pageSize: CONCEPT_PAGE_SIZE,
        total,
        totalPages: Math.max(1, Math.ceil(total / CONCEPT_PAGE_SIZE)),
      },
    };
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

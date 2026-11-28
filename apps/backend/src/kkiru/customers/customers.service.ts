import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { generateRandomCode, normalizeRandomCode } from '../../common/random-code';
import {
  type KkiruConsultationStatus,
  type KkiruCustomer,
  Prisma,
} from '../../generated/prisma/client';
// biome-ignore lint/style/useImportType: NestJS needs the runtime value for dependency injection metadata.
import { PrismaService } from '../../prisma/prisma.service';
import { KKIRU_PAGE_SIZE, toDateString, toPagination } from '../common/kkiru-fields';
import { pickSearch, type SortOrder } from '../common/list-query';
import type {
  CustomerDto,
  CustomerSearchField,
  CustomerSortField,
  ListCustomersQueryDto,
} from './dto/customer.dto';

const CODE_GENERATION_ATTEMPTS = 5;

export type CustomerSummary = {
  id: string;
  code: string;
  name: string;
  phone: string;
  consultationCount: number;
  createdAt: string;
};

export type CustomerDetail = Omit<CustomerSummary, 'consultationCount'> & {
  memo: string | null;
  /** 이 고객의 상담 (상담일 최근 순) */
  consultations: {
    code: string;
    title: string;
    status: KkiruConsultationStatus;
    consultedOn: string;
  }[];
  updatedAt: string;
};

export type CustomerListResponse = {
  items: CustomerSummary[];
  pagination: ReturnType<typeof toPagination>;
};

function customerNotFound() {
  return new NotFoundException('Customer not found');
}

function isUniqueViolation(error: unknown, field: string): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002' &&
    JSON.stringify(error.meta ?? {}).includes(field)
  );
}

/**
 * 이름·연락처·고객 번호로 찾는다. field로 한 항목만 고를 수 있다.
 * 연락처는 하이픈 없이 숫자 일부로도 찾는다.
 */
export function buildCustomerWhere(
  query: string,
  field: CustomerSearchField = 'all',
): Prisma.KkiruCustomerWhereInput {
  if (!query) {
    return {};
  }

  const digits = query.replace(/\D/g, '');
  const code = normalizeRandomCode(query);

  return pickSearch<Prisma.KkiruCustomerWhereInput>(
    {
      code: code ? { code: { contains: code } } : null,
      name: { name: { contains: query, mode: 'insensitive' } },
      phone: digits.length >= 3 ? { phone: { contains: digits } } : null,
    },
    field,
  );
}

const CUSTOMER_ORDER_BY: Record<
  CustomerSortField,
  (order: SortOrder) => Prisma.KkiruCustomerOrderByWithRelationInput
> = {
  consultationCount: (order) => ({ consultations: { _count: order } }),
  createdAt: (order) => ({ createdAt: order }),
  name: (order) => ({ name: order }),
  phone: (order) => ({ phone: order }),
};

function toSummary(
  customer: KkiruCustomer & { _count: { consultations: number } },
): CustomerSummary {
  return {
    code: customer.code,
    consultationCount: customer._count.consultations,
    createdAt: customer.createdAt.toISOString(),
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
  };
}

@Injectable()
export class KkiruCustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async list({
    field = 'all',
    order = 'desc',
    page = 1,
    q = '',
    sort = 'createdAt',
  }: ListCustomersQueryDto = {}): Promise<CustomerListResponse> {
    const where = buildCustomerWhere(q, field);
    const [total, customers] = await this.prisma.$transaction([
      this.prisma.kkiruCustomer.count({ where }),
      this.prisma.kkiruCustomer.findMany({
        include: { _count: { select: { consultations: true } } },
        orderBy: [CUSTOMER_ORDER_BY[sort](order), { createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * KKIRU_PAGE_SIZE,
        take: KKIRU_PAGE_SIZE,
        where,
      }),
    ]);

    return { items: customers.map(toSummary), pagination: toPagination(page, total) };
  }

  /** 연락처로 기존 고객을 찾는다. 상담을 만들 때 쓴다. 없으면 404 */
  async findByPhone(phone: string): Promise<CustomerSummary> {
    const customer = await this.prisma.kkiruCustomer.findUnique({
      include: { _count: { select: { consultations: true } } },
      where: { phone },
    });

    if (!customer) {
      throw customerNotFound();
    }

    return toSummary(customer);
  }

  async findByCode(rawCode: string): Promise<CustomerDetail> {
    const code = normalizeRandomCode(rawCode);
    const customer = code
      ? await this.prisma.kkiruCustomer.findUnique({
          include: {
            consultations: {
              orderBy: [{ consultedOn: 'desc' }, { createdAt: 'desc' }],
              select: { code: true, consultedOn: true, status: true, title: true },
            },
          },
          where: { code },
        })
      : null;

    if (!customer) {
      throw customerNotFound();
    }

    return {
      code: customer.code,
      consultations: customer.consultations.map((consultation) => ({
        code: consultation.code,
        consultedOn: toDateString(consultation.consultedOn),
        status: consultation.status,
        title: consultation.title,
      })),
      createdAt: customer.createdAt.toISOString(),
      id: customer.id,
      memo: customer.memo,
      name: customer.name,
      phone: customer.phone,
      updatedAt: customer.updatedAt.toISOString(),
    };
  }

  /** 고객을 추가한다. 같은 연락처의 고객이 있으면 409 */
  async create(input: CustomerDto): Promise<CustomerDetail> {
    for (let attempt = 1; ; attempt += 1) {
      try {
        const customer = await this.prisma.kkiruCustomer.create({
          data: {
            code: generateRandomCode(),
            memo: input.memo ?? null,
            name: input.name,
            phone: input.phone,
          },
        });

        return this.findByCode(customer.code);
      } catch (error) {
        if (isUniqueViolation(error, 'phone')) {
          throw new ConflictException('A customer with this phone already exists');
        }

        if (!isUniqueViolation(error, 'code') || attempt >= CODE_GENERATION_ATTEMPTS) {
          throw error;
        }
      }
    }
  }

  /** 이름·연락처를 고친다. 연락처가 다른 고객과 겹치면 409 */
  async update(rawCode: string, input: CustomerDto): Promise<CustomerDetail> {
    const code = normalizeRandomCode(rawCode);

    if (!code) {
      throw customerNotFound();
    }

    try {
      const { count } = await this.prisma.kkiruCustomer.updateMany({
        data: { memo: input.memo ?? null, name: input.name, phone: input.phone },
        where: { code },
      });

      if (count === 0) {
        throw customerNotFound();
      }
    } catch (error) {
      if (isUniqueViolation(error, 'phone')) {
        throw new ConflictException('A customer with this phone already exists');
      }

      throw error;
    }

    return this.findByCode(code);
  }
}

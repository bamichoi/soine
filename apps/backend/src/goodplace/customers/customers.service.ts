import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DEFAULT_PAGE_SIZE, type Pagination, toPagination } from '../../common/page-size';
import { generateRandomCode, normalizeRandomCode } from '../../common/random-code';
import {
  type GoodplaceCustomer,
  type GoodplaceMeetingStatus,
  Prisma,
} from '../../generated/prisma/client';
// biome-ignore lint/style/useImportType: NestJS needs the runtime value for dependency injection metadata.
import { PrismaService } from '../../prisma/prisma.service';
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
  meetingCount: number;
  createdAt: string;
};

export type CustomerDetail = Omit<CustomerSummary, 'meetingCount'> & {
  memo: string | null;
  /** 이 고객의 미팅 (미팅 일시 최근 순) */
  meetings: {
    code: string;
    title: string;
    status: GoodplaceMeetingStatus;
    meetAt: string;
  }[];
  updatedAt: string;
};

export type CustomerListResponse = {
  items: CustomerSummary[];
  pagination: Pagination;
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
): Prisma.GoodplaceCustomerWhereInput {
  if (!query) {
    return {};
  }

  const digits = query.replace(/\D/g, '');
  const code = normalizeRandomCode(query);

  return pickSearch<Prisma.GoodplaceCustomerWhereInput>(
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
  (order: SortOrder) => Prisma.GoodplaceCustomerOrderByWithRelationInput
> = {
  createdAt: (order) => ({ createdAt: order }),
  meetingCount: (order) => ({ meetings: { _count: order } }),
  name: (order) => ({ name: order }),
  phone: (order) => ({ phone: order }),
};

function toSummary(
  customer: GoodplaceCustomer & { _count: { meetings: number } },
): CustomerSummary {
  return {
    code: customer.code,
    createdAt: customer.createdAt.toISOString(),
    id: customer.id,
    meetingCount: customer._count.meetings,
    name: customer.name,
    phone: customer.phone,
  };
}

@Injectable()
export class GoodplaceCustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async list({
    field = 'all',
    order = 'desc',
    page = 1,
    size = DEFAULT_PAGE_SIZE,
    q = '',
    sort = 'createdAt',
  }: ListCustomersQueryDto = {}): Promise<CustomerListResponse> {
    const where = buildCustomerWhere(q, field);
    const [total, customers] = await this.prisma.$transaction([
      this.prisma.goodplaceCustomer.count({ where }),
      this.prisma.goodplaceCustomer.findMany({
        include: { _count: { select: { meetings: true } } },
        orderBy: [CUSTOMER_ORDER_BY[sort](order), { createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * size,
        take: size,
        where,
      }),
    ]);

    return { items: customers.map(toSummary), pagination: toPagination(page, size, total) };
  }

  /** 연락처로 기존 고객을 찾는다. 미팅을 만들 때 쓴다. 없으면 404 */
  async findByPhone(phone: string): Promise<CustomerSummary> {
    const customer = await this.prisma.goodplaceCustomer.findUnique({
      include: { _count: { select: { meetings: true } } },
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
      ? await this.prisma.goodplaceCustomer.findUnique({
          include: {
            meetings: {
              orderBy: [{ meetAt: 'desc' }, { createdAt: 'desc' }],
              select: { code: true, meetAt: true, status: true, title: true },
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
      createdAt: customer.createdAt.toISOString(),
      id: customer.id,
      meetings: customer.meetings.map((meeting) => ({
        code: meeting.code,
        meetAt: meeting.meetAt.toISOString(),
        status: meeting.status,
        title: meeting.title,
      })),
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
        const customer = await this.prisma.goodplaceCustomer.create({
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
      const { count } = await this.prisma.goodplaceCustomer.updateMany({
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

import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import { buildCustomerWhere, KkiruCustomersService } from './customers.service';

const CUSTOMER = {
  code: 'C7K3FQ9A',
  consultations: [],
  createdAt: new Date('2026-11-25T01:00:00.000Z'),
  id: 'customer-1',
  name: '김임차',
  phone: '01012345678',
  updatedAt: new Date('2026-11-25T01:00:00.000Z'),
};

function phoneConflict() {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    clientVersion: 'test',
    code: 'P2002',
    meta: { target: ['phone'] },
  });
}

function createService() {
  const customer = {
    create: jest.fn((): Promise<unknown> => Promise.resolve(CUSTOMER)),
    findUnique: jest.fn((): Promise<unknown> => Promise.resolve(CUSTOMER)),
    updateMany: jest.fn((): Promise<unknown> => Promise.resolve({ count: 1 })),
  };
  const prisma = { kkiruCustomer: customer } as unknown as PrismaService;

  return { customer, service: new KkiruCustomersService(prisma) };
}

describe('buildCustomerWhere', () => {
  it('searches name, phone digits and code', () => {
    expect(buildCustomerWhere('010-1234')).toEqual({
      // biome-ignore lint/style/useNamingConvention: Prisma filter operator.
      OR: [
        { name: { contains: '010-1234', mode: 'insensitive' } },
        { phone: { contains: '0101234' } },
      ],
    });
    expect(buildCustomerWhere('김임차')).toEqual({
      // biome-ignore lint/style/useNamingConvention: Prisma filter operator.
      OR: [{ name: { contains: '김임차', mode: 'insensitive' } }],
    });
  });
});

describe('KkiruCustomersService', () => {
  it('creates a customer with a random code', async () => {
    const { customer, service } = createService();

    await service.create({ name: '김임차', phone: '01012345678' });

    expect(customer.create).toHaveBeenCalledWith({
      data: {
        code: expect.stringMatching(/^[0-9A-HJKMNP-TV-Z]{8}$/),
        name: '김임차',
        phone: '01012345678',
      },
    });
  });

  it('returns 409 when the phone already belongs to a customer', async () => {
    const { customer, service } = createService();
    customer.create.mockRejectedValue(phoneConflict());
    customer.updateMany.mockRejectedValue(phoneConflict());

    await expect(service.create({ name: '김임차', phone: '01012345678' })).rejects.toBeInstanceOf(
      ConflictException,
    );
    await expect(
      service.update('C7K3FQ9A', { name: '김임차', phone: '01012345678' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('updates the name and phone of the customer', async () => {
    const { customer, service } = createService();

    await service.update('c7k3fq9a', { name: '김임차', phone: '01099998888' });

    expect(customer.updateMany).toHaveBeenCalledWith({
      data: { name: '김임차', phone: '01099998888' },
      where: { code: 'C7K3FQ9A' },
    });
  });

  it('returns 404 for an unknown customer or phone', async () => {
    const { customer, service } = createService();
    customer.findUnique.mockResolvedValue(null);
    customer.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.findByPhone('01000000000')).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.update('ZZZZZZZZ', { name: '이름', phone: '01000000000' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

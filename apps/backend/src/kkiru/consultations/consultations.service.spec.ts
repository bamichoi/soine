import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import { KkiruConsultationsService } from './consultations.service';

function createService() {
  const consultationListing = {
    deleteMany: jest.fn((): Promise<unknown> => Promise.resolve({ count: 1 })),
  };
  const prisma = {
    kkiruConsultation: {
      findUnique: jest.fn(() => Promise.resolve({ code: 'K7K3FQ9A', id: 'consultation-1' })),
    },
    kkiruConsultationListing: consultationListing,
  } as unknown as PrismaService;
  const service = new KkiruConsultationsService(prisma);
  jest.spyOn(service, 'findByCode').mockResolvedValue({} as never);

  return { consultationListing, service };
}

describe('KkiruConsultationsService listings', () => {
  it('removes only the link between the consultation and the listing', async () => {
    const { consultationListing, service } = createService();

    await service.removeListing('k7k3fq9a', 'listing-1');

    expect(consultationListing.deleteMany).toHaveBeenCalledWith({
      where: { consultationId: 'consultation-1', listingId: 'listing-1' },
    });
  });

  it('returns 404 when the listing is not in the consultation', async () => {
    const { consultationListing, service } = createService();
    consultationListing.deleteMany.mockResolvedValue({ count: 0 });

    await expect(service.removeListing('K7K3FQ9A', 'other')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

import { Injectable } from '@nestjs/common';
import type { ChoidolsangInquiryStatus } from '../../generated/prisma/client';
// biome-ignore lint/style/useImportType: NestJS needs the runtime value for dependency injection metadata.
import { PrismaService } from '../../prisma/prisma.service';

export const INQUIRY_PAGE_SIZE = 20;

export type InquiryListItem = {
  id: string;
  /** 문의 날짜 (YYYY-MM-DD) */
  inquiredOn: string;
  content: string;
  /** 희망 예약 일시 (ISO 8601), 없으면 null */
  desiredReservationAt: string | null;
  location: string | null;
  desiredConcept: string | null;
  status: ChoidolsangInquiryStatus;
};

export type InquiryListResponse = {
  items: InquiryListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

@Injectable()
export class ChoidolsangInquiriesService {
  constructor(private readonly prisma: PrismaService) {}

  // 최근 문의가 먼저 오도록 문의 날짜, 등록 시각 역순으로 정렬한다.
  async list(page = 1): Promise<InquiryListResponse> {
    const [total, inquiries] = await this.prisma.$transaction([
      this.prisma.choidolsangInquiry.count(),
      this.prisma.choidolsangInquiry.findMany({
        orderBy: [{ inquiredOn: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * INQUIRY_PAGE_SIZE,
        take: INQUIRY_PAGE_SIZE,
      }),
    ]);

    return {
      items: inquiries.map((inquiry) => ({
        content: inquiry.content,
        desiredConcept: inquiry.desiredConcept,
        desiredReservationAt: inquiry.desiredReservationAt?.toISOString() ?? null,
        id: inquiry.id,
        // DATE 컬럼은 UTC 자정으로 읽히므로 날짜 부분만 쓴다.
        inquiredOn: inquiry.inquiredOn.toISOString().slice(0, 10),
        location: inquiry.location,
        status: inquiry.status,
      })),
      pagination: {
        page,
        pageSize: INQUIRY_PAGE_SIZE,
        total,
        totalPages: Math.max(1, Math.ceil(total / INQUIRY_PAGE_SIZE)),
      },
    };
  }
}

import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ListConceptsQueryDto } from '../choidolsang/concepts/dto/concept.dto';
import { ListInquiriesQueryDto } from '../choidolsang/inquiries/dto/list-inquiries-query.dto';
import { ListReservationsQueryDto } from '../choidolsang/reservations/dto/create-reservation.dto';
import { ListContractsQueryDto } from '../goodplace/contracts/dto/contract.dto';
import { ListCustomersQueryDto } from '../goodplace/customers/dto/customer.dto';
import { ListListingsQueryDto } from '../goodplace/listings/dto/listing.dto';
import { ListMeetingsQueryDto } from '../goodplace/meetings/dto/meeting.dto';
import { toPagination } from './page-size';

// app.module.ts의 전역 ValidationPipe와 같은 설정
const pipe = new ValidationPipe({ forbidNonWhitelisted: true, transform: true, whitelist: true });

const LIST_QUERY_DTOS = [
  ListConceptsQueryDto,
  ListInquiriesQueryDto,
  ListReservationsQueryDto,
  ListContractsQueryDto,
  ListCustomersQueryDto,
  ListListingsQueryDto,
  ListMeetingsQueryDto,
];

function validate(metatype: (typeof LIST_QUERY_DTOS)[number], query: Record<string, string>) {
  return pipe.transform(query, { metatype, type: 'query' });
}

describe.each(LIST_QUERY_DTOS)('%p size', (metatype) => {
  it('accepts 10, 20, 50 and 100 from the query string', async () => {
    for (const size of ['10', '20', '50', '100']) {
      await expect(validate(metatype, { size })).resolves.toMatchObject({ size: Number(size) });
    }
  });

  it('leaves size empty when it is not sent', async () => {
    const query = (await validate(metatype, {})) as { size?: number };
    expect(query.size).toBeUndefined();
  });

  it('rejects other sizes with 400', async () => {
    for (const size of ['200', '0', '25', 'abc']) {
      await expect(validate(metatype, { size })).rejects.toBeInstanceOf(BadRequestException);
    }
  });
});

describe('toPagination', () => {
  it('counts pages by the page size, at least one', () => {
    expect(toPagination(1, 50, 101)).toEqual({ page: 1, pageSize: 50, total: 101, totalPages: 3 });
    expect(toPagination(1, 20, 0)).toEqual({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
  });
});

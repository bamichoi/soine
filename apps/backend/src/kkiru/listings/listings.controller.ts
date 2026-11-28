import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AdminSessionGuard, RequireAdminService } from '../../admin-auth/admin-session.guard';
// biome-ignore lint/style/useImportType: ValidationPipe needs the runtime DTO class.
import { ListingDto, ListingOptionsQueryDto, ListListingsQueryDto } from './dto/listing.dto';
import type {
  Listing,
  ListingDetail,
  ListingListResponse,
  ListingOption,
} from './listings.service';
// biome-ignore lint/style/useImportType: NestJS needs the runtime value for dependency injection metadata.
import { KkiruListingsService } from './listings.service';

// 끼루 데이터는 삭제하지 않으므로 삭제 API가 없다.
@Controller('admin/kkiru/listings')
@RequireAdminService('kkiru')
@UseGuards(AdminSessionGuard)
export class KkiruListingsController {
  constructor(private readonly listingsService: KkiruListingsService) {}

  @Get()
  list(@Query() query: ListListingsQueryDto): Promise<ListingListResponse> {
    return this.listingsService.list(query);
  }

  /** 고를 수 있는 매물 검색. ':code'보다 먼저 둔다. */
  @Get('options')
  options(@Query() query: ListingOptionsQueryDto): Promise<ListingOption[]> {
    return this.listingsService.options(query);
  }

  @Post()
  create(@Body() body: ListingDto): Promise<Listing> {
    return this.listingsService.create(body);
  }

  @Get(':code')
  findOne(@Param('code') code: string): Promise<ListingDetail> {
    return this.listingsService.findByCode(code);
  }

  @Patch(':code')
  update(@Param('code') code: string, @Body() body: ListingDto): Promise<ListingDetail> {
    return this.listingsService.update(code, body);
  }
}

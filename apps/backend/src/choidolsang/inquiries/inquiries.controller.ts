import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminSessionGuard, RequireAdminService } from '../../admin-auth/admin-session.guard';
// biome-ignore lint/style/useImportType: ValidationPipe needs the runtime DTO class.
import { CreateInquiryDto } from './dto/create-inquiry.dto';
// biome-ignore lint/style/useImportType: ValidationPipe needs the runtime DTO class.
import { ListInquiriesQueryDto } from './dto/list-inquiries-query.dto';
// biome-ignore lint/style/useImportType: ValidationPipe needs the runtime DTO class.
import { RejectInquiryDto } from './dto/reject-inquiry.dto';
import type { InquiryDetail, InquiryListResponse } from './inquiries.service';
// biome-ignore lint/style/useImportType: NestJS needs the runtime value for dependency injection metadata.
import { ChoidolsangInquiriesService } from './inquiries.service';

@Controller('admin/choidolsang/inquiries')
@RequireAdminService('choidolsang')
@UseGuards(AdminSessionGuard)
export class ChoidolsangInquiriesController {
  constructor(private readonly inquiriesService: ChoidolsangInquiriesService) {}

  @Get()
  list(@Query() query: ListInquiriesQueryDto): Promise<InquiryListResponse> {
    return this.inquiriesService.list(query);
  }

  @Post()
  create(@Body() body: CreateInquiryDto): Promise<InquiryDetail> {
    return this.inquiriesService.create(body);
  }

  @Post(':code/reject')
  @HttpCode(HttpStatus.OK)
  reject(@Param('code') code: string, @Body() body: RejectInquiryDto): Promise<InquiryDetail> {
    return this.inquiriesService.reject(code, body.reason);
  }

  @Post(':code/reopen')
  @HttpCode(HttpStatus.OK)
  reopen(@Param('code') code: string): Promise<InquiryDetail> {
    return this.inquiriesService.reopen(code);
  }

  @Get(':code')
  findOne(@Param('code') code: string): Promise<InquiryDetail> {
    return this.inquiriesService.findByCode(code);
  }
}

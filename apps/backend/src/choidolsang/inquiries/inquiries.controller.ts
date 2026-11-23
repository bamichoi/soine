import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminSessionGuard, RequireAdminService } from '../../admin-auth/admin-session.guard';
// biome-ignore lint/style/useImportType: ValidationPipe needs the runtime DTO class.
import { CreateInquiryDto } from './dto/create-inquiry.dto';
// biome-ignore lint/style/useImportType: ValidationPipe needs the runtime DTO class.
import { InquiryRecordDto } from './dto/inquiry-record.dto';
// biome-ignore lint/style/useImportType: ValidationPipe needs the runtime DTO class.
import { ListInquiriesQueryDto } from './dto/list-inquiries-query.dto';
// biome-ignore lint/style/useImportType: ValidationPipe needs the runtime DTO class.
import { RejectInquiryDto } from './dto/reject-inquiry.dto';
// biome-ignore lint/style/useImportType: ValidationPipe needs the runtime DTO class.
import { UpdateInquiryDto } from './dto/update-inquiry.dto';
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

  @Post(':code/records')
  addRecord(@Param('code') code: string, @Body() body: InquiryRecordDto): Promise<InquiryDetail> {
    return this.inquiriesService.addRecord(code, body);
  }

  @Patch(':code/records/:recordId')
  updateRecord(
    @Param('code') code: string,
    @Param('recordId', ParseUUIDPipe) recordId: string,
    @Body() body: InquiryRecordDto,
  ): Promise<InquiryDetail> {
    return this.inquiriesService.updateRecord(code, recordId, body);
  }

  @Delete(':code/records/:recordId')
  removeRecord(
    @Param('code') code: string,
    @Param('recordId', ParseUUIDPipe) recordId: string,
  ): Promise<InquiryDetail> {
    return this.inquiriesService.removeRecord(code, recordId);
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

  @Patch(':code')
  update(@Param('code') code: string, @Body() body: UpdateInquiryDto): Promise<InquiryDetail> {
    return this.inquiriesService.update(code, body);
  }

  @Delete(':code')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('code') code: string): Promise<void> {
    return this.inquiriesService.remove(code);
  }
}

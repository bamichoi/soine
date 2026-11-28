import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminSessionGuard, RequireAdminService } from '../../admin-auth/admin-session.guard';
// biome-ignore lint/style/useImportType: ValidationPipe needs the runtime DTO class.
import { LogRecordDto } from '../common/log-record.dto';
import type { ConsultationDetail, ConsultationListResponse } from './consultations.service';
// biome-ignore lint/style/useImportType: NestJS needs the runtime value for dependency injection metadata.
import { KkiruConsultationsService } from './consultations.service';
// biome-ignore lint/style/useImportType: ValidationPipe needs the runtime DTO class.
import {
  AddConsultationListingDto,
  CreateConsultationDto,
  ListConsultationsQueryDto,
  UpdateConsultationDto,
} from './dto/consultation.dto';

// 끼루 데이터는 삭제하지 않는다. 상담매물 빼기만 연결을 끊는다.
@Controller('admin/kkiru/consultations')
@RequireAdminService('kkiru')
@UseGuards(AdminSessionGuard)
export class KkiruConsultationsController {
  constructor(private readonly consultationsService: KkiruConsultationsService) {}

  @Get()
  list(@Query() query: ListConsultationsQueryDto): Promise<ConsultationListResponse> {
    return this.consultationsService.list(query);
  }

  @Post()
  create(@Body() body: CreateConsultationDto): Promise<ConsultationDetail> {
    return this.consultationsService.create(body);
  }

  @Get(':code')
  findOne(@Param('code') code: string): Promise<ConsultationDetail> {
    return this.consultationsService.findByCode(code);
  }

  @Patch(':code')
  update(
    @Param('code') code: string,
    @Body() body: UpdateConsultationDto,
  ): Promise<ConsultationDetail> {
    return this.consultationsService.update(code, body);
  }

  @Post(':code/records')
  addRecord(@Param('code') code: string, @Body() body: LogRecordDto): Promise<ConsultationDetail> {
    return this.consultationsService.addRecord(code, body);
  }

  @Patch(':code/records/:recordId')
  updateRecord(
    @Param('code') code: string,
    @Param('recordId', ParseUUIDPipe) recordId: string,
    @Body() body: LogRecordDto,
  ): Promise<ConsultationDetail> {
    return this.consultationsService.updateRecord(code, recordId, body);
  }

  @Post(':code/listings')
  addListing(
    @Param('code') code: string,
    @Body() body: AddConsultationListingDto,
  ): Promise<ConsultationDetail> {
    return this.consultationsService.addListing(code, body.listingId);
  }

  /** 상담매물 빼기 (상담과 매물의 연결만 끊는다) */
  @Delete(':code/listings/:listingId')
  removeListing(
    @Param('code') code: string,
    @Param('listingId', ParseUUIDPipe) listingId: string,
  ): Promise<ConsultationDetail> {
    return this.consultationsService.removeListing(code, listingId);
  }
}

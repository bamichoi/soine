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
import { LogRecordDto, ReasonDto } from '../common/log-record.dto';
// biome-ignore lint/style/useImportType: ValidationPipe needs the runtime DTO class.
import {
  AddMeetingListingDto,
  CreateMeetingDto,
  ListMeetingsQueryDto,
  UpdateMeetingDto,
} from './dto/meeting.dto';
import type { MeetingDetail, MeetingListResponse } from './meetings.service';
// biome-ignore lint/style/useImportType: NestJS needs the runtime value for dependency injection metadata.
import { GoodplaceMeetingsService } from './meetings.service';

// 굿플레이스 데이터는 삭제하지 않는다. 미팅 매물 빼기만 연결을 끊는다.
@Controller('admin/goodplace/meetings')
@RequireAdminService('goodplace')
@UseGuards(AdminSessionGuard)
export class GoodplaceMeetingsController {
  constructor(private readonly meetingsService: GoodplaceMeetingsService) {}

  @Get()
  list(@Query() query: ListMeetingsQueryDto): Promise<MeetingListResponse> {
    return this.meetingsService.list(query);
  }

  @Post()
  create(@Body() body: CreateMeetingDto): Promise<MeetingDetail> {
    return this.meetingsService.create(body);
  }

  @Get(':code')
  findOne(@Param('code') code: string): Promise<MeetingDetail> {
    return this.meetingsService.findByCode(code);
  }

  @Patch(':code')
  update(@Param('code') code: string, @Body() body: UpdateMeetingDto): Promise<MeetingDetail> {
    return this.meetingsService.update(code, body);
  }

  @Post(':code/records')
  addRecord(@Param('code') code: string, @Body() body: LogRecordDto): Promise<MeetingDetail> {
    return this.meetingsService.addRecord(code, body);
  }

  @Patch(':code/records/:recordId')
  updateRecord(
    @Param('code') code: string,
    @Param('recordId', ParseUUIDPipe) recordId: string,
    @Body() body: LogRecordDto,
  ): Promise<MeetingDetail> {
    return this.meetingsService.updateRecord(code, recordId, body);
  }

  @Post(':code/listings')
  addListing(
    @Param('code') code: string,
    @Body() body: AddMeetingListingDto,
  ): Promise<MeetingDetail> {
    return this.meetingsService.addListing(code, body.listingId);
  }

  /** 미팅 매물 빼기 (미팅과 매물의 연결만 끊는다). 계약이 걸린 매물은 뺄 수 없다. */
  @Delete(':code/listings/:listingId')
  removeListing(
    @Param('code') code: string,
    @Param('listingId', ParseUUIDPipe) listingId: string,
  ): Promise<MeetingDetail> {
    return this.meetingsService.removeListing(code, listingId);
  }

  @Post(':code/stop')
  @HttpCode(HttpStatus.OK)
  stop(@Param('code') code: string, @Body() body: ReasonDto): Promise<MeetingDetail> {
    return this.meetingsService.stop(code, body.reason);
  }

  @Post(':code/resume')
  @HttpCode(HttpStatus.OK)
  resume(@Param('code') code: string, @Body() body: ReasonDto): Promise<MeetingDetail> {
    return this.meetingsService.resume(code, body.reason);
  }
}

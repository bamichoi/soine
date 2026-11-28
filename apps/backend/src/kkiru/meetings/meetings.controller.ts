import {
  Body,
  Controller,
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
import { CreateMeetingDto, ListMeetingsQueryDto, UpdateMeetingDto } from './dto/meeting.dto';
import type { MeetingDetail, MeetingListResponse } from './meetings.service';
// biome-ignore lint/style/useImportType: NestJS needs the runtime value for dependency injection metadata.
import { KkiruMeetingsService } from './meetings.service';

// 끼루 데이터는 삭제하지 않으므로 삭제 API가 없다.
@Controller('admin/kkiru/meetings')
@RequireAdminService('kkiru')
@UseGuards(AdminSessionGuard)
export class KkiruMeetingsController {
  constructor(private readonly meetingsService: KkiruMeetingsService) {}

  @Get()
  list(@Query() query: ListMeetingsQueryDto): Promise<MeetingListResponse> {
    return this.meetingsService.list(query);
  }

  @Post()
  create(@Body() body: CreateMeetingDto): Promise<MeetingDetail> {
    return this.meetingsService.create(body);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<MeetingDetail> {
    return this.meetingsService.findById(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateMeetingDto,
  ): Promise<MeetingDetail> {
    return this.meetingsService.update(id, body);
  }

  @Post(':id/records')
  addRecord(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: LogRecordDto,
  ): Promise<MeetingDetail> {
    return this.meetingsService.addRecord(id, body);
  }

  @Patch(':id/records/:recordId')
  updateRecord(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('recordId', ParseUUIDPipe) recordId: string,
    @Body() body: LogRecordDto,
  ): Promise<MeetingDetail> {
    return this.meetingsService.updateRecord(id, recordId, body);
  }

  @Post(':id/stop')
  @HttpCode(HttpStatus.OK)
  stop(@Param('id', ParseUUIDPipe) id: string, @Body() body: ReasonDto): Promise<MeetingDetail> {
    return this.meetingsService.stop(id, body.reason);
  }

  @Post(':id/resume')
  @HttpCode(HttpStatus.OK)
  resume(@Param('id', ParseUUIDPipe) id: string, @Body() body: ReasonDto): Promise<MeetingDetail> {
    return this.meetingsService.resume(id, body.reason);
  }
}

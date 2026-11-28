import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminSessionGuard, RequireAdminService } from '../../admin-auth/admin-session.guard';
// biome-ignore lint/style/useImportType: ValidationPipe needs the runtime DTO class.
import { ScheduleQueryDto } from './dto/schedule.dto';
import type { ScheduleItem } from './schedule.service';
// biome-ignore lint/style/useImportType: NestJS needs the runtime value for dependency injection metadata.
import { KkiruScheduleService } from './schedule.service';

/** 일정 달력: 미팅·계약 일정 */
@Controller('admin/kkiru/schedule')
@RequireAdminService('kkiru')
@UseGuards(AdminSessionGuard)
export class KkiruScheduleController {
  constructor(private readonly scheduleService: KkiruScheduleService) {}

  @Get()
  list(@Query() query: ScheduleQueryDto): Promise<ScheduleItem[]> {
    return this.scheduleService.list(query);
  }
}

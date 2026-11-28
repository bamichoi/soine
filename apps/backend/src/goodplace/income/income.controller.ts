import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminSessionGuard, RequireAdminService } from '../../admin-auth/admin-session.guard';
// biome-ignore lint/style/useImportType: ValidationPipe needs the runtime DTO class.
import { IncomeQueryDto } from './dto/income.dto';
import type { IncomeSummary } from './income.service';
// biome-ignore lint/style/useImportType: NestJS needs the runtime value for dependency injection metadata.
import { GoodplaceIncomeService } from './income.service';

/** 수입: 잔금일 기준 계약 수수료 */
@Controller('admin/goodplace/income')
@RequireAdminService('goodplace')
@UseGuards(AdminSessionGuard)
export class GoodplaceIncomeController {
  constructor(private readonly incomeService: GoodplaceIncomeService) {}

  @Get()
  get(@Query() query: IncomeQueryDto): Promise<IncomeSummary> {
    return this.incomeService.get(query);
  }
}

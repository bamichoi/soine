import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminSessionGuard, RequireAdminService } from '../../admin-auth/admin-session.guard';
// biome-ignore lint/style/useImportType: ValidationPipe needs the runtime DTO class.
import { SalesItemsQueryDto, SalesPeriodQueryDto } from './dto/sales-query.dto';
import type { SalesItemsResponse, SalesSummary } from './sales.service';
// biome-ignore lint/style/useImportType: NestJS needs the runtime value for dependency injection metadata.
import { ChoidolsangSalesService } from './sales.service';

@Controller('admin/choidolsang/sales')
@RequireAdminService('choidolsang')
@UseGuards(AdminSessionGuard)
export class ChoidolsangSalesController {
  constructor(private readonly salesService: ChoidolsangSalesService) {}

  /** 기간 매출 요약·추이·컨셉별 */
  @Get('summary')
  summary(@Query() query: SalesPeriodQueryDto): Promise<SalesSummary> {
    return this.salesService.summary(query);
  }

  /** 기간 매출 내역 (완료 시각 최근 순) */
  @Get('items')
  items(@Query() query: SalesItemsQueryDto): Promise<SalesItemsResponse> {
    return this.salesService.items(query);
  }
}

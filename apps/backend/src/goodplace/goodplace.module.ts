import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { GoodplaceContractsController } from './contracts/contracts.controller';
import { GoodplaceContractsService } from './contracts/contracts.service';
import { GoodplaceCustomersController } from './customers/customers.controller';
import { GoodplaceCustomersService } from './customers/customers.service';
import { GoodplaceIncomeController } from './income/income.controller';
import { GoodplaceIncomeService } from './income/income.service';
import { GoodplaceListingsController } from './listings/listings.controller';
import { GoodplaceListingsService } from './listings/listings.service';
import { GoodplaceMeetingsController } from './meetings/meetings.controller';
import { GoodplaceMeetingsService } from './meetings/meetings.service';
import { GoodplaceScheduleController } from './schedule/schedule.controller';
import { GoodplaceScheduleService } from './schedule/schedule.service';

/** 굿플레이스(부동산 중개) 백오피스 API */
@Module({
  controllers: [
    GoodplaceContractsController,
    GoodplaceCustomersController,
    GoodplaceIncomeController,
    GoodplaceListingsController,
    GoodplaceMeetingsController,
    GoodplaceScheduleController,
  ],
  imports: [AdminAuthModule],
  providers: [
    GoodplaceContractsService,
    GoodplaceCustomersService,
    GoodplaceIncomeService,
    GoodplaceListingsService,
    GoodplaceMeetingsService,
    GoodplaceScheduleService,
  ],
})
export class GoodplaceModule {}

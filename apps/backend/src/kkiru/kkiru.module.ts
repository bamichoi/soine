import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { KkiruContractsController } from './contracts/contracts.controller';
import { KkiruContractsService } from './contracts/contracts.service';
import { KkiruCustomersController } from './customers/customers.controller';
import { KkiruCustomersService } from './customers/customers.service';
import { KkiruIncomeController } from './income/income.controller';
import { KkiruIncomeService } from './income/income.service';
import { KkiruListingsController } from './listings/listings.controller';
import { KkiruListingsService } from './listings/listings.service';
import { KkiruMeetingsController } from './meetings/meetings.controller';
import { KkiruMeetingsService } from './meetings/meetings.service';
import { KkiruScheduleController } from './schedule/schedule.controller';
import { KkiruScheduleService } from './schedule/schedule.service';

/** 끼루(부동산 중개) 백오피스 API */
@Module({
  controllers: [
    KkiruContractsController,
    KkiruCustomersController,
    KkiruIncomeController,
    KkiruListingsController,
    KkiruMeetingsController,
    KkiruScheduleController,
  ],
  imports: [AdminAuthModule],
  providers: [
    KkiruContractsService,
    KkiruCustomersService,
    KkiruIncomeService,
    KkiruListingsService,
    KkiruMeetingsService,
    KkiruScheduleService,
  ],
})
export class KkiruModule {}

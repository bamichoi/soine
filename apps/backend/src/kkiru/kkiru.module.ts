import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { KkiruConsultationsController } from './consultations/consultations.controller';
import { KkiruConsultationsService } from './consultations/consultations.service';
import { KkiruContractsController } from './contracts/contracts.controller';
import { KkiruContractsService } from './contracts/contracts.service';
import { KkiruCustomersController } from './customers/customers.controller';
import { KkiruCustomersService } from './customers/customers.service';
import { KkiruListingsController } from './listings/listings.controller';
import { KkiruListingsService } from './listings/listings.service';
import { KkiruMeetingsController } from './meetings/meetings.controller';
import { KkiruMeetingsService } from './meetings/meetings.service';
import { KkiruScheduleController } from './schedule/schedule.controller';
import { KkiruScheduleService } from './schedule/schedule.service';

/** 끼루(부동산 중개) 백오피스 API */
@Module({
  controllers: [
    KkiruConsultationsController,
    KkiruContractsController,
    KkiruCustomersController,
    KkiruListingsController,
    KkiruMeetingsController,
    KkiruScheduleController,
  ],
  imports: [AdminAuthModule],
  providers: [
    KkiruConsultationsService,
    KkiruContractsService,
    KkiruCustomersService,
    KkiruListingsService,
    KkiruMeetingsService,
    KkiruScheduleService,
  ],
})
export class KkiruModule {}

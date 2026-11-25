import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { KkiruCustomersController } from './customers/customers.controller';
import { KkiruCustomersService } from './customers/customers.service';
import { KkiruListingsController } from './listings/listings.controller';
import { KkiruListingsService } from './listings/listings.service';

/** 끼루(부동산 중개) 백오피스 API */
@Module({
  controllers: [KkiruCustomersController, KkiruListingsController],
  imports: [AdminAuthModule],
  providers: [KkiruCustomersService, KkiruListingsService],
})
export class KkiruModule {}

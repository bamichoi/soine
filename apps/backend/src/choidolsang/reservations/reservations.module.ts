import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../../admin-auth/admin-auth.module';
import { ChoidolsangReservationsController } from './reservations.controller';
import { ChoidolsangReservationsService } from './reservations.service';

@Module({
  controllers: [ChoidolsangReservationsController],
  imports: [AdminAuthModule],
  providers: [ChoidolsangReservationsService],
})
export class ChoidolsangReservationsModule {}

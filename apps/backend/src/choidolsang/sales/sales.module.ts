import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../../admin-auth/admin-auth.module';
import { ChoidolsangSalesController } from './sales.controller';
import { ChoidolsangSalesService } from './sales.service';

@Module({
  controllers: [ChoidolsangSalesController],
  imports: [AdminAuthModule],
  providers: [ChoidolsangSalesService],
})
export class ChoidolsangSalesModule {}

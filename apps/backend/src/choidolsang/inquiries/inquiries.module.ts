import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../../admin-auth/admin-auth.module';
import { ChoidolsangInquiriesController } from './inquiries.controller';
import { ChoidolsangInquiriesService } from './inquiries.service';

@Module({
  controllers: [ChoidolsangInquiriesController],
  imports: [AdminAuthModule],
  providers: [ChoidolsangInquiriesService],
})
export class ChoidolsangInquiriesModule {}

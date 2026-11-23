import { Module } from '@nestjs/common';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';

@Module({
  controllers: [AdminAuthController],
  exports: [AdminAuthService],
  providers: [AdminAuthService],
})
export class AdminAuthModule {}

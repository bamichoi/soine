import { Module } from '@nestjs/common';
import { AdminSessionStoreService } from './admin-session-store.service';

@Module({
  exports: [AdminSessionStoreService],
  providers: [AdminSessionStoreService],
})
export class AdminSessionModule {}

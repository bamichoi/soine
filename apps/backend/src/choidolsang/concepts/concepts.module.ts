import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../../admin-auth/admin-auth.module';
import { ChoidolsangConceptsController } from './concepts.controller';
import { ChoidolsangConceptsService } from './concepts.service';

@Module({
  controllers: [ChoidolsangConceptsController],
  imports: [AdminAuthModule],
  providers: [ChoidolsangConceptsService],
})
export class ChoidolsangConceptsModule {}

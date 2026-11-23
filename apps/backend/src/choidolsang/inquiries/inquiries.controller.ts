import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminSessionGuard, RequireAdminService } from '../../admin-auth/admin-session.guard';
// biome-ignore lint/style/useImportType: ValidationPipe needs the runtime DTO class.
import { ListInquiriesQueryDto } from './dto/list-inquiries-query.dto';
// biome-ignore lint/style/useImportType: NestJS needs the runtime value for dependency injection metadata.
import { ChoidolsangInquiriesService, type InquiryListResponse } from './inquiries.service';

@Controller('admin/choidolsang/inquiries')
@RequireAdminService('choidolsang')
@UseGuards(AdminSessionGuard)
export class ChoidolsangInquiriesController {
  constructor(private readonly inquiriesService: ChoidolsangInquiriesService) {}

  @Get()
  list(@Query() query: ListInquiriesQueryDto): Promise<InquiryListResponse> {
    return this.inquiriesService.list(query.page);
  }
}

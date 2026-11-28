import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AdminSessionGuard, RequireAdminService } from '../../admin-auth/admin-session.guard';
import type { CustomerDetail, CustomerListResponse, CustomerSummary } from './customers.service';
// biome-ignore lint/style/useImportType: NestJS needs the runtime value for dependency injection metadata.
import { GoodplaceCustomersService } from './customers.service';
// biome-ignore lint/style/useImportType: ValidationPipe needs the runtime DTO class.
import { CustomerDto, CustomerLookupQueryDto, ListCustomersQueryDto } from './dto/customer.dto';

// 굿플레이스 데이터는 삭제하지 않으므로 삭제 API가 없다.
@Controller('admin/goodplace/customers')
@RequireAdminService('goodplace')
@UseGuards(AdminSessionGuard)
export class GoodplaceCustomersController {
  constructor(private readonly customersService: GoodplaceCustomersService) {}

  @Get()
  list(@Query() query: ListCustomersQueryDto): Promise<CustomerListResponse> {
    return this.customersService.list(query);
  }

  /** 연락처로 기존 고객 찾기. ':code'보다 먼저 둔다. */
  @Get('lookup')
  lookup(@Query() query: CustomerLookupQueryDto): Promise<CustomerSummary> {
    return this.customersService.findByPhone(query.phone);
  }

  @Post()
  create(@Body() body: CustomerDto): Promise<CustomerDetail> {
    return this.customersService.create(body);
  }

  @Get(':code')
  findOne(@Param('code') code: string): Promise<CustomerDetail> {
    return this.customersService.findByCode(code);
  }

  @Patch(':code')
  update(@Param('code') code: string, @Body() body: CustomerDto): Promise<CustomerDetail> {
    return this.customersService.update(code, body);
  }
}

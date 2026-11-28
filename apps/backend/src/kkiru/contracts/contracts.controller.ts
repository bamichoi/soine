import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminSessionGuard, RequireAdminService } from '../../admin-auth/admin-session.guard';
// biome-ignore lint/style/useImportType: ValidationPipe needs the runtime DTO class.
import { ReasonDto } from '../common/log-record.dto';
import type { ContractDetail, ContractListResponse } from './contracts.service';
// biome-ignore lint/style/useImportType: NestJS needs the runtime value for dependency injection metadata.
import { KkiruContractsService } from './contracts.service';
// biome-ignore lint/style/useImportType: ValidationPipe needs the runtime DTO class.
import { CreateContractDto, ListContractsQueryDto, UpdateContractDto } from './dto/contract.dto';

// 끼루 데이터는 삭제하지 않으므로 삭제 API가 없다.
@Controller('admin/kkiru/contracts')
@RequireAdminService('kkiru')
@UseGuards(AdminSessionGuard)
export class KkiruContractsController {
  constructor(private readonly contractsService: KkiruContractsService) {}

  @Get()
  list(@Query() query: ListContractsQueryDto): Promise<ContractListResponse> {
    return this.contractsService.list(query);
  }

  @Post()
  create(@Body() body: CreateContractDto): Promise<ContractDetail> {
    return this.contractsService.create(body);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ContractDetail> {
    return this.contractsService.findById(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateContractDto,
  ): Promise<ContractDetail> {
    return this.contractsService.update(id, body);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  complete(@Param('id', ParseUUIDPipe) id: string): Promise<ContractDetail> {
    return this.contractsService.complete(id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@Param('id', ParseUUIDPipe) id: string, @Body() body: ReasonDto): Promise<ContractDetail> {
    return this.contractsService.cancel(id, body.reason);
  }
}

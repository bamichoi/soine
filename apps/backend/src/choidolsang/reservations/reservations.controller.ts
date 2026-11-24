import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminSessionGuard, RequireAdminService } from '../../admin-auth/admin-session.guard';
// biome-ignore lint/style/useImportType: ValidationPipe needs the runtime DTO class.
import { CreateReservationDto, ListReservationsQueryDto } from './dto/create-reservation.dto';
import type { Reservation, ReservationListResponse } from './reservations.service';
// biome-ignore lint/style/useImportType: NestJS needs the runtime value for dependency injection metadata.
import { ChoidolsangReservationsService } from './reservations.service';

@Controller('admin/choidolsang/reservations')
@RequireAdminService('choidolsang')
@UseGuards(AdminSessionGuard)
export class ChoidolsangReservationsController {
  constructor(private readonly reservationsService: ChoidolsangReservationsService) {}

  @Get()
  list(@Query() query: ListReservationsQueryDto): Promise<ReservationListResponse> {
    return this.reservationsService.list(query);
  }

  @Post()
  create(@Body() body: CreateReservationDto): Promise<Reservation> {
    return this.reservationsService.create(body);
  }

  @Post(':code/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@Param('code') code: string): Promise<Reservation> {
    return this.reservationsService.cancel(code);
  }

  @Post(':code/complete')
  @HttpCode(HttpStatus.OK)
  complete(@Param('code') code: string): Promise<Reservation> {
    return this.reservationsService.complete(code);
  }

  @Get(':code')
  findOne(@Param('code') code: string): Promise<Reservation> {
    return this.reservationsService.findByCode(code);
  }
}

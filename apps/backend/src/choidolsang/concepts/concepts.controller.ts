import {
  Body,
  Controller,
  Delete,
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
import type { Concept, ConceptListResponse } from './concepts.service';
// biome-ignore lint/style/useImportType: NestJS needs the runtime value for dependency injection metadata.
import { ChoidolsangConceptsService } from './concepts.service';
// biome-ignore lint/style/useImportType: ValidationPipe needs the runtime DTO class.
import { ConceptDto, ListConceptsQueryDto } from './dto/concept.dto';

@Controller('admin/choidolsang/concepts')
@RequireAdminService('choidolsang')
@UseGuards(AdminSessionGuard)
export class ChoidolsangConceptsController {
  constructor(private readonly conceptsService: ChoidolsangConceptsService) {}

  @Get()
  list(@Query() query: ListConceptsQueryDto): Promise<ConceptListResponse> {
    return this.conceptsService.list(query);
  }

  @Post()
  create(@Body() body: ConceptDto): Promise<Concept> {
    return this.conceptsService.create(body);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Concept> {
    return this.conceptsService.findById(id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() body: ConceptDto): Promise<Concept> {
    return this.conceptsService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.conceptsService.remove(id);
  }
}

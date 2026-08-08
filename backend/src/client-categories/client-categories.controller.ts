import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClientCategoriesService } from './client-categories.service';
import {
  CreateClientCategoryDto,
  UpdateClientCategoryDto,
} from './dto/client-category.dto';
import { User } from '../auth/entities/user.entity';

@ApiTags('Client categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('client-categories')
export class ClientCategoriesController {
  constructor(private readonly service: ClientCategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List client categories for organization' })
  findAll(
    @Request() req: { user: User },
    @Query('companyId') companyId?: string,
  ) {
    const scoped =
      companyId ?? req.user.distributorProfile?.companyId ?? undefined;
    return this.service.findAll(scoped);
  }

  @Post()
  @ApiOperation({ summary: 'Create client category' })
  create(
    @Request() req: { user: User },
    @Body() dto: CreateClientCategoryDto,
  ) {
    const companyId =
      dto.companyId?.trim() ||
      req.user.distributorProfile?.companyId ||
      undefined;
    return this.service.create({ ...dto, companyId });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update client category' })
  update(@Param('id') id: string, @Body() dto: UpdateClientCategoryDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate client category' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

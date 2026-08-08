import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { PositionsService } from './positions.service';
import { CreatePositionDto, UpdatePositionDto } from './dto/position.dto';

@ApiTags('Positions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('positions')
export class PositionsController {
  constructor(private readonly service: PositionsService) {}

  @Get()
  @ApiOperation({ summary: 'List staff positions (lavozimlar)' })
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Create position' })
  create(@Body() dto: CreatePositionDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Update position' })
  update(@Param('id') id: string, @Body() dto: UpdatePositionDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Deactivate position' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

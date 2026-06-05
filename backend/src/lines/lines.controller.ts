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
import { LinesService } from './lines.service';
import { CreateLineDto, UpdateLineDto } from './dto/line.dto';
import { User } from '../auth/entities/user.entity';

@ApiTags('Lines')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('lines')
export class LinesController {
  constructor(private readonly service: LinesService) {}

  @Get()
  @ApiOperation({ summary: 'List sales lines' })
  findAll(
    @Request() req: { user: User },
    @Query('companyId') companyId?: string,
  ) {
    const scopedCompany =
      companyId ?? req.user.distributorProfile?.companyId ?? undefined;
    return this.service.findAll(scopedCompany);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get line by ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create line' })
  create(@Body() dto: CreateLineDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update line' })
  update(@Param('id') id: string, @Body() dto: UpdateLineDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate line' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

import {
  Body,
  Controller,
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
import { AdminGuard } from '../common/guards/admin.guard';
import { User } from '../auth/entities/user.entity';
import { OrderReturnStatus } from '../common/enums';
import { ReturnsService } from './returns.service';
import { CreateReturnDto } from '../payments/dto/payment.dto';

@ApiTags('Returns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ReturnsController {
  constructor(private readonly service: ReturnsService) {}

  @Post('orders/:id/returns')
  @ApiOperation({ summary: 'Courier requests return (partial/full)' })
  create(
    @Request() req: { user: User },
    @Param('id') id: string,
    @Body() dto: CreateReturnDto,
  ) {
    return this.service.create(id, req.user.distributorProfile!.id, dto);
  }

  @Get('returns')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'List returns (admin)' })
  findAll(@Query('status') status?: OrderReturnStatus) {
    return this.service.findAll(status);
  }

  @Patch('returns/:id/accept')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Accept return → restock' })
  accept(@Param('id') id: string) {
    return this.service.accept(id);
  }

  @Patch('returns/:id/reject')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Reject return' })
  reject(@Param('id') id: string) {
    return this.service.reject(id);
  }
}

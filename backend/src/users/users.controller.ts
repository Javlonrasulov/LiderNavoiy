import { Body, Controller, Delete, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CreateAppUserDto, UpdateAppUserDto } from './dto/app-user.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('app')
  @ApiOperation({ summary: 'Create mobile app login (APK)' })
  createAppUser(@Body() dto: CreateAppUserDto) {
    return this.usersService.create(dto);
  }

  @Patch('app/:id')
  @ApiOperation({ summary: 'Update mobile app login credentials' })
  updateAppUser(@Param('id') id: string, @Body() dto: UpdateAppUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete('app/:id')
  @ApiOperation({ summary: 'Deactivate mobile app user' })
  deactivateAppUser(@Param('id') id: string) {
    return this.usersService.deactivate(id);
  }
}

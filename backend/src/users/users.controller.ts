import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { RequirePage } from '../common/guards/permissions.guard';
import { CreateAppUserDto, UpdateAppUserDto } from './dto/app-user.dto';
import { CreateSystemUserDto, UpdateSystemUserDto } from './dto/system-user.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('app')
  @RequirePage('xodimlar')
  @ApiOperation({ summary: 'List mobile app users (APK logins)' })
  listAppUsers() {
    return this.usersService.findAllApp();
  }

  @Post('app')
  @RequirePage('xodimlar')
  @ApiOperation({ summary: 'Create mobile app login (APK)' })
  createAppUser(@Body() dto: CreateAppUserDto) {
    return this.usersService.create(dto);
  }

  @Patch('app/:id')
  @RequirePage('xodimlar')
  @ApiOperation({ summary: 'Update mobile app login credentials' })
  updateAppUser(@Param('id') id: string, @Body() dto: UpdateAppUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete('app/:id')
  @RequirePage('xodimlar')
  @ApiOperation({ summary: 'Deactivate mobile app user' })
  deactivateAppUser(@Param('id') id: string) {
    return this.usersService.deactivate(id);
  }

  @Get('system')
  @RequirePage('systemUsers')
  @ApiOperation({ summary: 'List admin panel users' })
  listSystemUsers() {
    return this.usersService.findAllSystem();
  }

  @Post('system')
  @RequirePage('systemUsers')
  @ApiOperation({ summary: 'Create admin panel user' })
  createSystemUser(@Body() dto: CreateSystemUserDto) {
    return this.usersService.createSystem(dto);
  }

  @Patch('system/:id')
  @RequirePage('systemUsers')
  @ApiOperation({ summary: 'Update admin panel user' })
  updateSystemUser(@Param('id') id: string, @Body() dto: UpdateSystemUserDto) {
    return this.usersService.updateSystem(id, dto);
  }

  @Delete('system/:id')
  @RequirePage('systemUsers')
  @ApiOperation({ summary: 'Deactivate admin panel user' })
  deactivateSystemUser(@Param('id') id: string) {
    return this.usersService.deactivateSystem(id);
  }
}

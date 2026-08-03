import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import {
  RegisterFcmTokenDto,
  SendNotificationDto,
  BroadcastNotificationDto,
  SendToUsersDto,
} from './dto/notification.dto';
import { User } from '../auth/entities/user.entity';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Post('fcm-token')
  @ApiOperation({ summary: 'Register FCM device token (agent / client / admin web)' })
  registerToken(
    @Request() req: { user: User },
    @Body() dto: RegisterFcmTokenDto,
  ) {
    return this.service.registerFcmToken(req.user.id, dto.token);
  }

  @Get()
  @ApiOperation({ summary: 'Get my notification history' })
  getMine(@Request() req: { user: User }) {
    return this.service.getMyNotifications(req.user.id);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  unreadCount(@Request() req: { user: User }) {
    return this.service.getUnreadCount(req.user.id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllRead(@Request() req: { user: User }) {
    return this.service.markAllRead(req.user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  markRead(@Request() req: { user: User }, @Param('id') id: string) {
    return this.service.markAsRead(req.user.id, id);
  }

  // ─── Admin endpoints ───

  @Post('send')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Send push to user or distributor (admin)' })
  send(@Body() dto: SendNotificationDto) {
    return this.service.send(dto);
  }

  @Post('send-many')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Send push to multiple users (admin)' })
  sendMany(@Body() dto: SendToUsersDto) {
    return this.service.sendToMany(dto);
  }

  @Post('broadcast')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Broadcast push (agents / clients / admins / all)' })
  broadcast(@Body() dto: BroadcastNotificationDto) {
    return this.service.broadcast(dto);
  }
}

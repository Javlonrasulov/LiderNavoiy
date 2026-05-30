import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { Conversation } from './entities/conversation.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { MessageDeletion } from './entities/message-deletion.entity';
import { User } from '../auth/entities/user.entity';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { MessagesGateway } from './messages.gateway';
import { MessagesUploadService } from './messages-upload.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, ChatMessage, MessageDeletion, User]),
    NotificationsModule,
    ConfigModule,
    JwtModule.register({}),
  ],
  controllers: [MessagesController],
  providers: [MessagesService, MessagesGateway, MessagesUploadService],
  exports: [MessagesService, MessagesGateway, MessagesUploadService],
})
export class MessagesModule {}

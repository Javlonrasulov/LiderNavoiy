import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MessagesService } from './messages.service';
import { JwtPayload } from '../auth/auth.service';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/messages',
})
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessagesGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly messagesService: MessagesService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.config.get('JWT_SECRET'),
      });

      client.data.userId = payload.sub;
      client.join(`user:${payload.sub}`);
      this.logger.log(`Messages client connected: ${client.id} (${payload.username})`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Messages client disconnected: ${client.id}`);
  }

  @SubscribeMessage('message:send')
  async handleSend(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      conversationId: string;
      text?: string;
      attachment?: {
        url: string;
        fileName: string;
        mimeType: string;
        fileSize: number;
        messageType: 'image' | 'document';
      };
    },
  ) {
    const userId = client.data.userId as string;
    if (!userId || !data?.conversationId) {
      return { error: 'Invalid message' };
    }
    if (!data.text?.trim() && !data.attachment) {
      return { error: 'Invalid message' };
    }

    try {
      const msg = await this.messagesService.sendMessage(
        data.conversationId,
        userId,
        data.text,
        data.attachment,
        true,
      );
      await this.broadcastNewMessage(msg, userId);
      return { status: 'ok', message: msg };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Send failed';
      return { error: message };
    }
  }

  async broadcastNewMessage(
    msg: { id: string; conversationId: string; senderId: string; text: string; isRead: boolean; createdAt: string },
    senderId: string,
  ) {
    const conv = await this.messagesService.getConversationForUser(
      msg.conversationId,
      senderId,
    );
    if (!conv?.otherUser?.id) return;

    const recipientId = conv.otherUser.id;
    const [senderSummary, recipientSummary] = await Promise.all([
      this.messagesService.getConversationForUser(msg.conversationId, senderId),
      this.messagesService.getConversationForUser(msg.conversationId, recipientId),
    ]);

    this.server.to(`user:${senderId}`).emit('message:new', {
      message: msg,
      conversation: senderSummary,
    });
    this.server.to(`user:${recipientId}`).emit('message:new', {
      message: msg,
      conversation: recipientSummary,
    });
  }

  async broadcastMessageDeleted(
    conversationId: string,
    actorId: string,
    messageIds: string[],
    forEveryone: boolean,
  ) {
    const convs = await this.messagesService.getConversations(actorId);
    const current = convs.find((c) => c.id === conversationId);

    const actorPayload = {
      conversationId,
      messageIds,
      forEveryone,
      conversation: current,
    };
    this.server.to(`user:${actorId}`).emit('message:deleted', actorPayload);

    if (forEveryone && current?.otherUser?.id) {
      const otherConvs = await this.messagesService.getConversations(current.otherUser.id);
      const otherCurrent = otherConvs.find((c) => c.id === conversationId);
      this.server.to(`user:${current.otherUser.id}`).emit('message:deleted', {
        conversationId,
        messageIds,
        forEveryone: true,
        conversation: otherCurrent,
      });
    }
  }
}

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { MessageDeletion } from './entities/message-deletion.entity';
import { User } from '../auth/entities/user.entity';
import { Client } from '../clients/entities/client.entity';
import { UserRole } from '../common/enums';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification.types';
import { PushI18n, normalizePushLang } from '../notifications/push-i18n';

export interface ChatUserDto {
  id: string;
  fullName: string;
  role: string;
  username: string;
}

export interface LastMessageDto {
  id: string;
  text: string;
  senderId: string;
  createdAt: string;
  isRead: boolean;
  messageType: string;
  fileName: string | null;
}

export interface MessageAttachmentDto {
  url: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  messageType: 'image' | 'document';
}

export interface MessageDto {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  isRead: boolean;
  createdAt: string;
  messageType: string;
  fileUrl: string | null;
  fileName: string | null;
  fileMime: string | null;
  fileSize: number | null;
}

export interface ConversationDto {
  id: string;
  otherUser: ChatUserDto;
  lastMessage: LastMessageDto | null;
  unreadCount: number;
  updatedAt: string;
}

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Conversation)
    private readonly convRepo: Repository<Conversation>,
    @InjectRepository(ChatMessage)
    private readonly msgRepo: Repository<ChatMessage>,
    @InjectRepository(MessageDeletion)
    private readonly deletionRepo: Repository<MessageDeletion>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  private publicFileUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const normalized = path.startsWith('/') ? path : `/${path}`;
    const base = this.config.get<string>('PUBLIC_URL')?.replace(/\/$/, '');
    // PUBLIC_URL yo'q bo'lsa relative qoldiramiz — client o'zi API host bilan yig'adi
    if (!base) return normalized;
    return `${base}${normalized}`;
  }

  private pairIds(a: string, b: string): [string, string] {
    return a < b ? [a, b] : [b, a];
  }

  private formatChatDisplayName(user: User, viewerRole?: UserRole): string {
    const base = user.fullName?.trim() || user.username || 'Noma\'lum';
    if (user.role === UserRole.CLIENT && viewerRole && viewerRole !== UserRole.CLIENT) {
      return `${base} (klient)`;
    }
    return base;
  }

  private toUserDto(user: User, viewerRole?: UserRole): ChatUserDto {
    return {
      id: user.id,
      fullName: this.formatChatDisplayName(user, viewerRole),
      role: user.role,
      username: user.username,
    };
  }

  private async assertParticipant(conversationId: string, userId: string) {
    const conv = await this.convRepo.findOne({ where: { id: conversationId } });
    if (!conv) throw new NotFoundException('Conversation not found');
    if (conv.userLowId !== userId && conv.userHighId !== userId) {
      throw new ForbiddenException('Not a participant');
    }
    return conv;
  }

  async getContacts(userId: string, _companyId?: string): Promise<ChatUserDto[]> {
    // Xodimlar: admin, menejer, agent (klientlar alohida — client-contacts)
    const users = await this.userRepo
      .createQueryBuilder('u')
      .where('u.isActive = :active', { active: true })
      .andWhere('u.id != :userId', { userId })
      .andWhere('u.role != :clientRole', { clientRole: UserRole.CLIENT })
      .orderBy('u.fullName', 'ASC')
      .getMany();
    return users.map((u) => this.toUserDto(u));
  }

  /**
   * Agentga biriktirilgan va ilova loginiga ega klientlar.
   * Admin/menejer — barcha faol klient akkauntlari.
   */
  async getClientContacts(userId: string): Promise<ChatUserDto[]> {
    const viewer = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['distributorProfile'],
    });
    if (!viewer) return [];

    if (viewer.role === UserRole.DISTRIBUTOR) {
      const distributorId = viewer.distributorProfile?.id;
      if (!distributorId) return [];

      const clients = await this.clientRepo.find({
        where: { distributorId, isActive: true },
        select: ['id', 'name', 'code'],
      });
      if (!clients.length) return [];

      const clientIds = clients.map((c) => c.id);
      const users = await this.userRepo.find({
        where: {
          role: UserRole.CLIENT,
          isActive: true,
          clientId: In(clientIds),
        },
      });

      const clientMap = new Map(clients.map((c) => [c.id, c]));
      return users
        .map((u) => {
          const client = u.clientId ? clientMap.get(u.clientId) : undefined;
          return {
            id: u.id,
            fullName: (client?.name || u.fullName || u.username).trim(),
            role: u.role,
            username: u.username,
          };
        })
        .sort((a, b) => a.fullName.localeCompare(b.fullName, 'uz'));
    }

    if (viewer.role === UserRole.ADMIN || viewer.role === UserRole.MANAGER) {
      const users = await this.userRepo.find({
        where: { role: UserRole.CLIENT, isActive: true },
        relations: ['client'],
      });
      return users
        .map((u) => ({
          id: u.id,
          fullName: (u.client?.name || u.fullName || u.username).trim(),
          role: u.role,
          username: u.username,
        }))
        .sort((a, b) => a.fullName.localeCompare(b.fullName, 'uz'));
    }

    return [];
  }

  private async assertCanStartConversation(actorId: string, other: User) {
    if (other.role !== UserRole.CLIENT) return;

    const actor = await this.userRepo.findOne({
      where: { id: actorId },
      relations: ['distributorProfile'],
    });
    if (!actor) throw new ForbiddenException('Not allowed');

    // Agent faqat o'ziga biriktirilgan klient bilan yozishadi
    if (actor.role === UserRole.DISTRIBUTOR) {
      const distributorId = actor.distributorProfile?.id;
      if (!distributorId || !other.clientId) {
        throw new ForbiddenException('Client is not assigned to you');
      }
      const client = await this.clientRepo.findOne({ where: { id: other.clientId } });
      if (!client || client.distributorId !== distributorId) {
        throw new ForbiddenException('Client is not assigned to you');
      }
    }
  }

  async findOrCreateConversation(userId: string, otherUserId: string): Promise<ConversationDto> {
    if (userId === otherUserId) {
      throw new BadRequestException('Cannot chat with yourself');
    }

    const other = await this.userRepo.findOne({ where: { id: otherUserId, isActive: true } });
    if (!other) throw new NotFoundException('User not found');

    await this.assertCanStartConversation(userId, other);

    const [low, high] = this.pairIds(userId, otherUserId);
    let conv = await this.convRepo.findOne({ where: { userLowId: low, userHighId: high } });

    if (!conv) {
      conv = await this.convRepo.save(
        this.convRepo.create({ userLowId: low, userHighId: high }),
      );
    }

    const viewer = await this.userRepo.findOne({ where: { id: userId } });
    return this.toConversationDto(conv, userId, viewer?.role);
  }

  async getConversations(userId: string): Promise<ConversationDto[]> {
    const convs = await this.convRepo.find({
      where: [{ userLowId: userId }, { userHighId: userId }],
      order: { updatedAt: 'DESC' },
    });

    const viewer = await this.userRepo.findOne({ where: { id: userId } });
    return Promise.all(convs.map((c) => this.toConversationDto(c, userId, viewer?.role)));
  }

  async getConversationForUser(
    conversationId: string,
    userId: string,
  ): Promise<ConversationDto | null> {
    try {
      const conv = await this.assertParticipant(conversationId, userId);
      const viewer = await this.userRepo.findOne({ where: { id: userId } });
      return this.toConversationDto(conv, userId, viewer?.role);
    } catch {
      return null;
    }
  }

  async getMessages(
    conversationId: string,
    userId: string,
    limit = 50,
    before?: string,
  ): Promise<MessageDto[]> {
    await this.assertParticipant(conversationId, userId);

    const qb = this.msgRepo
      .createQueryBuilder('m')
      .leftJoin(
        MessageDeletion,
        'md',
        'md.messageId = m.id AND md.userId = :userId',
        { userId },
      )
      .where('m.conversationId = :conversationId', { conversationId })
      .andWhere('m.isDeletedForAll = :allFalse', { allFalse: false })
      .andWhere('md.id IS NULL')
      .orderBy('m.createdAt', 'DESC')
      .take(Math.min(limit, 100));

    if (before) {
      const cursor = await this.msgRepo.findOne({ where: { id: before } });
      if (cursor) {
        qb.andWhere('m.createdAt < :createdAt', { createdAt: cursor.createdAt });
      }
    }

    const rows = await qb.getMany();
    return rows.reverse().map((m) => this.toMessageDto(m));
  }

  async sendMessage(
    conversationId: string,
    senderId: string,
    text?: string,
    attachment?: MessageAttachmentDto,
    skipPush = false,
  ): Promise<MessageDto> {
    const conv = await this.assertParticipant(conversationId, senderId);
    const trimmed = (text ?? '').trim();
    const hasAttachment = Boolean(attachment?.url && attachment?.messageType);

    if (!trimmed && !hasAttachment) {
      throw new BadRequestException('Message text or attachment is required');
    }

    const messageType = hasAttachment ? attachment!.messageType : 'text';

    const msg = await this.msgRepo.save(
      this.msgRepo.create({
        conversationId,
        senderId,
        text: trimmed,
        messageType,
        fileUrl: hasAttachment ? attachment!.url : null,
        fileName: hasAttachment ? attachment!.fileName : null,
        fileMime: hasAttachment ? attachment!.mimeType : null,
        fileSize: hasAttachment ? attachment!.fileSize : null,
        isRead: false,
      }),
    );

    conv.updatedAt = new Date();
    await this.convRepo.save(conv);

    const recipientId = conv.userLowId === senderId ? conv.userHighId : conv.userLowId;

    if (!skipPush) {
      const [sender, recipient] = await Promise.all([
        this.userRepo.findOne({ where: { id: senderId } }),
        this.userRepo.findOne({ where: { id: recipientId } }),
      ]);
      const senderLabel = sender
        ? this.formatChatDisplayName(sender, recipient?.role)
        : PushI18n.newMessageFallback(normalizePushLang(recipient?.preferredLanguage));
      const lang = normalizePushLang(recipient?.preferredLanguage);
      const preview = trimmed
        || (messageType === 'image'
          ? PushI18n.imagePreview(lang)
          : PushI18n.filePreview(lang, attachment?.fileName));
      await this.notifications.sendToUser(
        recipientId,
        senderLabel,
        preview.length > 80 ? preview.slice(0, 80) + '…' : preview,
        NotificationType.MESSAGE,
        { conversationId, messageId: msg.id, type: 'message' },
      );
    }

    return this.toMessageDto(msg);
  }

  async markRead(
    conversationId: string,
    userId: string,
  ): Promise<{ updated: number; messageIds: string[]; senderIds: string[] }> {
    await this.assertParticipant(conversationId, userId);

    const toMark = await this.msgRepo.find({
      where: { conversationId, isRead: false },
    });
    const incoming = toMark.filter((m) => m.senderId !== userId);
    const messageIds = incoming.map((m) => m.id);
    const senderIds = [...new Set(incoming.map((m) => m.senderId))];

    if (!messageIds.length) {
      return { updated: 0, messageIds: [], senderIds: [] };
    }

    await this.msgRepo
      .createQueryBuilder()
      .update(ChatMessage)
      .set({ isRead: true })
      .where('id IN (:...messageIds)', { messageIds })
      .execute();

    return { updated: messageIds.length, messageIds, senderIds };
  }

  async deleteMessages(
    conversationId: string,
    userId: string,
    messageIds: string[],
    forEveryone: boolean,
  ): Promise<{ deleted: string[] }> {
    if (!messageIds.length) {
      throw new BadRequestException('No messages selected');
    }

    await this.assertParticipant(conversationId, userId);

    const msgs = await this.msgRepo.find({
      where: { conversationId, id: In(messageIds) },
    });

    const deleted: string[] = [];

    for (const msg of msgs) {
      if (forEveryone && msg.senderId === userId) {
        msg.isDeletedForAll = true;
        await this.msgRepo.save(msg);
        deleted.push(msg.id);
        continue;
      }

      const exists = await this.deletionRepo.findOne({
        where: { messageId: msg.id, userId },
      });
      if (!exists) {
        await this.deletionRepo.save(
          this.deletionRepo.create({ messageId: msg.id, userId }),
        );
      }
      deleted.push(msg.id);
    }

    return { deleted };
  }

  private async getLastVisibleMessage(
    conversationId: string,
    viewerId: string,
  ): Promise<ChatMessage | null> {
    return this.msgRepo
      .createQueryBuilder('m')
      .leftJoin(
        MessageDeletion,
        'md',
        'md.messageId = m.id AND md.userId = :viewerId',
        { viewerId },
      )
      .where('m.conversationId = :conversationId', { conversationId })
      .andWhere('m.isDeletedForAll = :allFalse', { allFalse: false })
      .andWhere('md.id IS NULL')
      .orderBy('m.createdAt', 'DESC')
      .getOne();
  }

  private async toConversationDto(
    conv: Conversation,
    viewerId: string,
    viewerRole?: UserRole,
  ): Promise<ConversationDto> {
    const otherId = conv.userLowId === viewerId ? conv.userHighId : conv.userLowId;
    const other = await this.userRepo.findOne({ where: { id: otherId } });

    const last = await this.getLastVisibleMessage(conv.id, viewerId);

    const unreadCount = await this.msgRepo.count({
      where: {
        conversationId: conv.id,
        isRead: false,
        senderId: otherId,
      },
    });

    return {
      id: conv.id,
      otherUser: other
        ? this.toUserDto(other, viewerRole)
        : { id: otherId, fullName: 'Noma\'lum', role: 'unknown', username: '' },
      lastMessage: last ? this.toLastMessageDto(last) : null,
      unreadCount,
      updatedAt: conv.updatedAt.toISOString(),
    };
  }

  private toMessageDto(m: ChatMessage): MessageDto {
    return {
      id: m.id,
      conversationId: m.conversationId,
      senderId: m.senderId,
      text: m.text,
      isRead: m.isRead,
      createdAt: m.createdAt.toISOString(),
      messageType: m.messageType ?? 'text',
      fileUrl: this.publicFileUrl(m.fileUrl),
      fileName: m.fileName,
      fileMime: m.fileMime,
      fileSize: m.fileSize,
    };
  }

  private previewText(m: ChatMessage): string {
    if (m.text) return m.text;
    if (m.messageType === 'image') return '📷 Rasm';
    if (m.messageType === 'document') return `📎 ${m.fileName ?? 'Fayl'}`;
    return '';
  }

  private toLastMessageDto(m: ChatMessage): LastMessageDto {
    return {
      id: m.id,
      text: this.previewText(m),
      senderId: m.senderId,
      createdAt: m.createdAt.toISOString(),
      isRead: m.isRead,
      messageType: m.messageType ?? 'text',
      fileName: m.fileName,
    };
  }
}

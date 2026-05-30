import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Conversation } from './conversation.entity';

@Entity('chat_messages')
@Index(['conversationId', 'createdAt'])
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  conversationId: string;

  @Column({ type: 'uuid' })
  senderId: string;

  @Column({ type: 'text', default: '' })
  text: string;

  @Column({ type: 'varchar', default: 'text' })
  messageType: 'text' | 'image' | 'document';

  @Column({ type: 'varchar', nullable: true })
  fileUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  fileName: string | null;

  @Column({ type: 'varchar', nullable: true })
  fileMime: string | null;

  @Column({ type: 'int', nullable: true })
  fileSize: number | null;

  @Column({ default: false })
  isRead: boolean;

  @Column({ default: false })
  isDeletedForAll: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Conversation, (c) => c.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;
}

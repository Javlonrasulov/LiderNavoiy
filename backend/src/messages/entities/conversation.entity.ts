import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { ChatMessage } from './chat-message.entity';

@Entity('conversations')
@Index(['userLowId', 'userHighId'], { unique: true })
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userLowId: string;

  @Column({ type: 'uuid' })
  userHighId: string;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => ChatMessage, (m) => m.conversation)
  messages: ChatMessage[];
}

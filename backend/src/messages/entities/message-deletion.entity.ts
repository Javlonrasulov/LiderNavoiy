import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('message_deletions')
@Index(['messageId', 'userId'], { unique: true })
export class MessageDeletion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  messageId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @CreateDateColumn()
  deletedAt: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('location_points')
@Index(['distributorId', 'recordedAt'])
@Index(['distributorId', 'syncedAt'])
export class LocationPoint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  distributorId: string;

  @Column({ type: 'double precision' })
  latitude: number;

  @Column({ type: 'double precision' })
  longitude: number;

  @Column({ type: 'double precision', nullable: true })
  speed: number | null;

  @Column({ type: 'double precision', nullable: true })
  accuracy: number | null;

  @Column({ type: 'double precision', nullable: true })
  altitude: number | null;

  @Column({ type: 'double precision', nullable: true })
  bearing: number | null;

  @Column({ type: 'timestamptz' })
  recordedAt: Date;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  receivedAt: Date;

  @Column({ default: true })
  isSynced: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  syncedAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  deviceId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}

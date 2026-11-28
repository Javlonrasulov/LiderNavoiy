import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum RecordingStatus {
  PENDING_CONSENT = 'pending_consent',
  CONSENT_DENIED = 'consent_denied',
  RECORDING = 'recording',
  INTERRUPTED = 'interrupted',
  UPLOADING = 'uploading',
  UPLOADED = 'uploaded',
  FAILED = 'failed',
  EXPIRED = 'expired',
}

export enum RecordingUploadStatus {
  NONE = 'none',
  PENDING = 'pending',
  UPLOADING = 'uploading',
  UPLOADED = 'uploaded',
  FAILED = 'failed',
}

export enum VisitRecordingOutcome {
  WITH_ORDER = 'with_order',
  WITHOUT_ORDER = 'without_order',
  CANCELLED = 'cancelled',
  UNKNOWN = 'unknown',
}

@Entity('visit_recordings')
@Index(['distributorId', 'startedAt'])
@Index(['companyId', 'startedAt'])
@Index(['visitId'], { unique: true })
@Index(['expiresAt'])
@Index(['clientId'])
export class VisitRecording {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  visitId: string;

  @Column('uuid')
  distributorId: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  companyId: string | null;

  @Column('uuid')
  clientId: string;

  @Column({ type: 'uuid', nullable: true })
  orderId: string | null;

  @Column({ type: 'timestamptz' })
  startedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  endedAt: Date | null;

  @Column({ type: 'int', nullable: true })
  durationSeconds: number | null;

  @Column({ type: 'varchar', length: 32, default: RecordingStatus.RECORDING })
  status: RecordingStatus;

  @Column({ type: 'varchar', length: 32, default: RecordingUploadStatus.NONE })
  uploadStatus: RecordingUploadStatus;

  @Column({ type: 'varchar', length: 32, default: VisitRecordingOutcome.UNKNOWN })
  visitOutcome: VisitRecordingOutcome;

  @Column({ default: false })
  clientConsent: boolean;

  /** Agent sozlamasi sessiyani ochish paytida (server tekshiruvi) */
  @Column({ default: true })
  recordingEnabledAtStart: boolean;

  @Column({ type: 'varchar', length: 512, nullable: true })
  storageKey: string | null;

  @Column({ type: 'bigint', nullable: true })
  fileSizeBytes: number | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  mimeType: string | null;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'text', nullable: true })
  failureReason: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, Repository } from 'typeorm';
import { Visit } from '../visits/entities/visit.entity';
import { VisitStatus } from '../common/enums';
import { DistributorProfile } from '../distributors/entities/distributor-profile.entity';
import { Client } from '../clients/entities/client.entity';
import { Order } from '../orders/entities/order.entity';
import { User } from '../auth/entities/user.entity';
import {
  RecordingStatus,
  RecordingUploadStatus,
  VisitRecording,
  VisitRecordingOutcome,
} from './entities/visit-recording.entity';
import { RecordingUploadService } from './recording-upload.service';
import {
  isWithinAgentRecordingWindow,
  recordingExpiresAt,
  tashkentDayBounds,
} from './tashkent-time.util';
import {
  CompleteVisitDto,
  FinishRecordingDto,
  OpenRecordingSessionDto,
  StartVisitDto,
} from './dto/recording.dto';
import { resolveCompanyIds } from '../common/company-scope.util';

@Injectable()
export class RecordingsService {
  private readonly logger = new Logger(RecordingsService.name);

  constructor(
    @InjectRepository(VisitRecording)
    private readonly recordingRepo: Repository<VisitRecording>,
    @InjectRepository(Visit)
    private readonly visitRepo: Repository<Visit>,
    @InjectRepository(DistributorProfile)
    private readonly profileRepo: Repository<DistributorProfile>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    private readonly uploadService: RecordingUploadService,
  ) {}

  async startVisit(distributorId: string, dto: StartVisitDto) {
    const profile = await this.profileRepo.findOne({ where: { id: distributorId } });
    if (!profile) throw new NotFoundException('Distributor not found');

    const client = await this.clientRepo.findOne({ where: { id: dto.clientId } });
    if (!client) throw new NotFoundException('Client not found');

    const open = await this.visitRepo.findOne({
      where: {
        distributorId,
        clientId: dto.clientId,
        status: VisitStatus.IN_PROGRESS,
      },
      order: { visitedAt: 'DESC' },
    });
    if (open) {
      return {
        visit: open,
        recordVisitAudio: !!profile.recordVisitAudio,
        reused: true,
      };
    }

    const visitedAt = dto.visitedAt ? new Date(dto.visitedAt) : new Date();
    const visit = this.visitRepo.create({
      distributorId,
      clientId: dto.clientId,
      visitedAt,
      checkInLatitude: dto.checkInLatitude ?? null,
      checkInLongitude: dto.checkInLongitude ?? null,
      notes: null,
      orderTotal: 0,
      status: VisitStatus.IN_PROGRESS,
      isOfflineCreated: false,
    });
    const saved = await this.visitRepo.save(visit);
    return {
      visit: saved,
      recordVisitAudio: !!profile.recordVisitAudio,
      reused: false,
    };
  }

  async completeVisit(
    distributorId: string,
    visitId: string,
    dto: CompleteVisitDto,
  ) {
    const visit = await this.requireOwnVisit(distributorId, visitId);
    if (
      visit.status === VisitStatus.COMPLETED ||
      visit.status === VisitStatus.CANCELLED
    ) {
      return visit;
    }

    const outcome = this.parseOutcome(dto.outcome);
    visit.status =
      outcome === VisitRecordingOutcome.CANCELLED
        ? VisitStatus.CANCELLED
        : VisitStatus.COMPLETED;
    if (dto.orderTotal != null) visit.orderTotal = dto.orderTotal;
    if (dto.notes != null) visit.notes = dto.notes;
    const saved = await this.visitRepo.save(visit);

    const recording = await this.recordingRepo.findOne({ where: { visitId } });
    if (recording) {
      recording.visitOutcome = outcome;
      if (dto.orderId) recording.orderId = dto.orderId;
      if (!recording.endedAt) recording.endedAt = new Date();
      await this.recordingRepo.save(recording);
    }
    return saved;
  }

  async openSession(distributorId: string, dto: OpenRecordingSessionDto) {
    const profile = await this.profileRepo.findOne({ where: { id: distributorId } });
    if (!profile) throw new NotFoundException('Distributor not found');

    // Fresh flag — eski lokal true qiymat serverni aldamasın
    if (!profile.recordVisitAudio) {
      throw new ForbiddenException('Visit audio recording is disabled for this agent');
    }

    const visit = await this.requireOwnVisit(distributorId, dto.visitId);
    if (visit.status !== VisitStatus.IN_PROGRESS) {
      throw new BadRequestException('Visit is not in progress');
    }

    const existing = await this.recordingRepo.findOne({ where: { visitId: visit.id } });
    if (existing) {
      if (
        existing.status === RecordingStatus.RECORDING ||
        existing.status === RecordingStatus.UPLOADING ||
        existing.status === RecordingStatus.UPLOADED ||
        existing.status === RecordingStatus.INTERRUPTED
      ) {
        return this.toDto(existing);
      }
      if (existing.status === RecordingStatus.CONSENT_DENIED && !dto.clientConsent) {
        return this.toDto(existing);
      }
    }

    if (!dto.clientConsent) {
      const denied =
        existing ??
        this.recordingRepo.create({
          visitId: visit.id,
          distributorId,
          companyId: profile.companyId,
          clientId: visit.clientId,
          startedAt: visit.visitedAt,
          endedAt: new Date(),
          status: RecordingStatus.CONSENT_DENIED,
          uploadStatus: RecordingUploadStatus.NONE,
          clientConsent: false,
          recordingEnabledAtStart: true,
          expiresAt: recordingExpiresAt(visit.visitedAt),
          visitOutcome: VisitRecordingOutcome.UNKNOWN,
        });
      denied.status = RecordingStatus.CONSENT_DENIED;
      denied.clientConsent = false;
      denied.endedAt = denied.endedAt ?? new Date();
      const saved = await this.recordingRepo.save(denied);
      return this.toDto(saved);
    }

    if (existing && existing.status === RecordingStatus.CONSENT_DENIED) {
      existing.clientConsent = true;
      existing.status = RecordingStatus.RECORDING;
      existing.endedAt = null;
      existing.recordingEnabledAtStart = true;
      const saved = await this.recordingRepo.save(existing);
      return this.toDto(saved);
    }

    const row = this.recordingRepo.create({
      visitId: visit.id,
      distributorId,
      companyId: profile.companyId,
      clientId: visit.clientId,
      startedAt: visit.visitedAt,
      status: RecordingStatus.RECORDING,
      uploadStatus: RecordingUploadStatus.PENDING,
      clientConsent: true,
      recordingEnabledAtStart: true,
      expiresAt: recordingExpiresAt(visit.visitedAt),
      visitOutcome: VisitRecordingOutcome.UNKNOWN,
    });
    const saved = await this.recordingRepo.save(row);
    return this.toDto(saved);
  }

  async finishSession(
    distributorId: string,
    recordingId: string,
    dto: FinishRecordingDto,
  ) {
    const recording = await this.requireOwnRecording(distributorId, recordingId);
    if (
      recording.status === RecordingStatus.UPLOADED ||
      recording.status === RecordingStatus.EXPIRED
    ) {
      return this.toDto(recording);
    }

    recording.endedAt = recording.endedAt ?? new Date();
    if (dto.durationSeconds != null) {
      recording.durationSeconds = dto.durationSeconds;
    } else if (recording.startedAt && recording.endedAt) {
      recording.durationSeconds = Math.max(
        0,
        Math.round((recording.endedAt.getTime() - recording.startedAt.getTime()) / 1000),
      );
    }
    if (dto.orderId) recording.orderId = dto.orderId;
    if (dto.outcome) recording.visitOutcome = this.parseOutcome(dto.outcome);

    if (dto.interrupted) {
      recording.status = RecordingStatus.INTERRUPTED;
      recording.failureReason = dto.failureReason ?? 'interrupted';
    } else if (dto.failureReason && recording.uploadStatus !== RecordingUploadStatus.UPLOADED) {
      recording.status = RecordingStatus.FAILED;
      recording.failureReason = dto.failureReason;
    } else if (recording.uploadStatus === RecordingUploadStatus.UPLOADED) {
      recording.status = RecordingStatus.UPLOADED;
    } else if (recording.storageKey) {
      recording.status = RecordingStatus.UPLOADED;
      recording.uploadStatus = RecordingUploadStatus.UPLOADED;
    } else if (recording.status === RecordingStatus.CONSENT_DENIED) {
      recording.status = RecordingStatus.CONSENT_DENIED;
    } else {
      // Fayl hali kelmagan — upload kutiladi (INTERRUPTED qilib qo‘ymaslik)
      recording.status = RecordingStatus.UPLOADING;
      recording.uploadStatus = RecordingUploadStatus.PENDING;
    }

    const saved = await this.recordingRepo.save(recording);
    return this.toDto(saved);
  }

  async uploadAudio(
    distributorId: string,
    recordingId: string,
    file: Express.Multer.File,
  ) {
    const recording = await this.requireOwnRecording(distributorId, recordingId);

    if (recording.expiresAt.getTime() <= Date.now()) {
      recording.status = RecordingStatus.EXPIRED;
      await this.recordingRepo.save(recording);
      throw new ForbiddenException('Recording has expired');
    }

    if (!recording.clientConsent || !recording.recordingEnabledAtStart) {
      throw new ForbiddenException('Recording not allowed for this session');
    }

    // Idempotent: already uploaded
    if (
      recording.uploadStatus === RecordingUploadStatus.UPLOADED &&
      recording.storageKey
    ) {
      return this.toDto(recording);
    }

    recording.uploadStatus = RecordingUploadStatus.UPLOADING;
    recording.status = RecordingStatus.UPLOADING;
    await this.recordingRepo.save(recording);

    try {
      // Late upload must not extend expiry
      const savedFile = this.uploadService.saveAudio(file, {
        companyId: recording.companyId,
        recordingId: recording.id,
      });
      if (recording.storageKey && recording.storageKey !== savedFile.storageKey) {
        this.uploadService.deleteFile(recording.storageKey);
      }
      recording.storageKey = savedFile.storageKey;
      recording.fileSizeBytes = savedFile.fileSizeBytes;
      recording.mimeType = savedFile.mimeType;
      recording.uploadStatus = RecordingUploadStatus.UPLOADED;
      // Upload muvaffaqiyatli — status uploaded (interrupted bo‘lsa ham fayl saqlangan)
      recording.status = RecordingStatus.UPLOADED;
      recording.failureReason = null;
      if (!recording.endedAt) recording.endedAt = new Date();
      if (recording.durationSeconds == null && recording.startedAt && recording.endedAt) {
        recording.durationSeconds = Math.max(
          0,
          Math.round(
            (recording.endedAt.getTime() - recording.startedAt.getTime()) / 1000,
          ),
        );
      }
      const saved = await this.recordingRepo.save(recording);
      return this.toDto(saved);
    } catch (e) {
      recording.uploadStatus = RecordingUploadStatus.FAILED;
      recording.status = RecordingStatus.FAILED;
      recording.failureReason = (e as Error).message;
      await this.recordingRepo.save(recording);
      throw e;
    }
  }

  async linkOrder(distributorId: string, recordingId: string, orderId: string) {
    const recording = await this.requireOwnRecording(distributorId, recordingId);
    recording.orderId = orderId;
    recording.visitOutcome = VisitRecordingOutcome.WITH_ORDER;
    const saved = await this.recordingRepo.save(recording);

    const visit = await this.visitRepo.findOne({ where: { id: recording.visitId } });
    if (visit && visit.distributorId === distributorId) {
      const order = await this.orderRepo.findOne({ where: { id: orderId } });
      if (order) {
        visit.orderTotal = Number(order.totalAmount) || visit.orderTotal;
        if (!order.visitId) {
          order.visitId = visit.id;
          await this.orderRepo.save(order);
        }
        await this.visitRepo.save(visit);
      }
    }
    return this.toDto(saved);
  }

  async listMine(
    distributorId: string,
    opts: { day?: 'today' | 'yesterday'; q?: string; page?: number; pageSize?: number },
  ) {
    const day = opts.day === 'yesterday' ? 'yesterday' : 'today';
    const { from, to } = tashkentDayBounds(day);
    const page = Math.max(1, opts.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, opts.pageSize ?? 20));

    const qb = this.recordingRepo
      .createQueryBuilder('r')
      .where('r.distributorId = :distributorId', { distributorId })
      .andWhere('r.startedAt BETWEEN :from AND :to', { from, to })
      .andWhere('r.status NOT IN (:...hidden)', {
        hidden: [RecordingStatus.CONSENT_DENIED],
      })
      .orderBy('r.startedAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    if (opts.q?.trim()) {
      const q = `%${opts.q.trim().toLowerCase()}%`;
      qb.andWhere(
        `EXISTS (
          SELECT 1 FROM clients c
          WHERE c.id = r."clientId"
            AND (LOWER(c.name) LIKE :q OR LOWER(COALESCE(c.code, '')) LIKE :q)
        )`,
        { q },
      );
    }

    const [rows, total] = await qb.getManyAndCount();
    const items = await this.enrichList(rows, { maskExpiredAudio: true });
    return { items, total, page, pageSize, day };
  }

  async listAdmin(
    user: User,
    opts: {
      companyId?: string;
      distributorId?: string;
      from?: string;
      to?: string;
      q?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    const companyIds = resolveCompanyIds(user, opts.companyId);
    if (Array.isArray(companyIds) && companyIds.length === 0) {
      return { items: [], total: 0, page: 1, pageSize: 20 };
    }

    const page = Math.max(1, opts.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 20));
    const qb = this.recordingRepo
      .createQueryBuilder('r')
      .where('r.status NOT IN (:...hidden)', {
        hidden: [RecordingStatus.CONSENT_DENIED],
      })
      .orderBy('r.startedAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    if (companyIds?.length) {
      qb.andWhere('r.companyId IN (:...companyIds)', { companyIds });
    }
    if (opts.distributorId) {
      qb.andWhere('r.distributorId = :distributorId', {
        distributorId: opts.distributorId,
      });
    }
    if (opts.from) {
      qb.andWhere('r.startedAt >= :from', { from: new Date(opts.from) });
    }
    if (opts.to) {
      qb.andWhere('r.startedAt <= :to', { to: new Date(opts.to) });
    }
    if (opts.q?.trim()) {
      const q = `%${opts.q.trim().toLowerCase()}%`;
      qb.andWhere(
        `(
          EXISTS (
            SELECT 1 FROM clients c
            WHERE c.id = r."clientId"
              AND (LOWER(c.name) LIKE :q OR LOWER(COALESCE(c.code, '')) LIKE :q)
          )
          OR EXISTS (
            SELECT 1 FROM distributor_profiles dp
            LEFT JOIN users u ON u.id = dp."userId"
            WHERE dp.id = r."distributorId"
              AND LOWER(COALESCE(u."fullName", '')) LIKE :q
          )
        )`,
        { q },
      );
    }

    const [rows, total] = await qb.getManyAndCount();
    const items = await this.enrichList(rows, {
      maskExpiredAudio: true,
      includeAgent: true,
    });
    return { items, total, page, pageSize };
  }

  async getOneForAgent(distributorId: string, recordingId: string) {
    const recording = await this.requireOwnRecording(distributorId, recordingId);
    if (!isWithinAgentRecordingWindow(recording.startedAt)) {
      throw new ForbiddenException('Recording is outside today/yesterday window');
    }
    const [item] = await this.enrichList([recording], { maskExpiredAudio: true });
    return item;
  }

  async getOneForAdmin(user: User, recordingId: string) {
    const recording = await this.recordingRepo.findOne({ where: { id: recordingId } });
    if (!recording) throw new NotFoundException('Recording not found');
    this.assertCompanyAccess(user, recording.companyId);
    const [item] = await this.enrichList([recording], {
      maskExpiredAudio: true,
      includeAgent: true,
    });
    return item;
  }

  async openAudioStream(
    recording: VisitRecording,
  ): Promise<{ stream: NodeJS.ReadableStream; size: number; mimeType: string }> {
    this.assertPlayable(recording);
    if (!recording.storageKey) {
      throw new NotFoundException('Audio not uploaded yet');
    }
    const { stream, size } = this.uploadService.openReadStream(recording.storageKey);
    return {
      stream,
      size,
      mimeType: recording.mimeType || 'audio/mp4',
    };
  }

  async resolvePlayableForAgent(distributorId: string, recordingId: string) {
    const recording = await this.requireOwnRecording(distributorId, recordingId);
    if (!isWithinAgentRecordingWindow(recording.startedAt)) {
      throw new ForbiddenException('Recording is outside today/yesterday window');
    }
    return recording;
  }

  async resolvePlayableForAdmin(user: User, recordingId: string) {
    const recording = await this.recordingRepo.findOne({ where: { id: recordingId } });
    if (!recording) throw new NotFoundException('Recording not found');
    this.assertCompanyAccess(user, recording.companyId);
    return recording;
  }

  async cleanupExpired(): Promise<{ deletedFiles: number; marked: number }> {
    const now = new Date();
    const expired = await this.recordingRepo.find({
      where: {
        expiresAt: LessThan(now),
        status: In([
          RecordingStatus.UPLOADED,
          RecordingStatus.INTERRUPTED,
          RecordingStatus.FAILED,
          RecordingStatus.UPLOADING,
          RecordingStatus.RECORDING,
        ]),
      },
      take: 200,
    });

    let deletedFiles = 0;
    let marked = 0;
    for (const row of expired) {
      if (row.storageKey) {
        if (this.uploadService.deleteFile(row.storageKey)) deletedFiles++;
        row.storageKey = null;
        row.fileSizeBytes = null;
      }
      row.status = RecordingStatus.EXPIRED;
      row.uploadStatus =
        row.uploadStatus === RecordingUploadStatus.UPLOADED
          ? RecordingUploadStatus.UPLOADED
          : RecordingUploadStatus.NONE;
      await this.recordingRepo.save(row);
      marked++;
    }
    if (marked > 0) {
      this.logger.log(`Expired recordings cleaned: marked=${marked} files=${deletedFiles}`);
    }
    return { deletedFiles, marked };
  }

  private assertPlayable(recording: VisitRecording) {
    if (recording.expiresAt.getTime() <= Date.now() || recording.status === RecordingStatus.EXPIRED) {
      throw new ForbiddenException('Recording has expired');
    }
    if (
      recording.status === RecordingStatus.CONSENT_DENIED ||
      !recording.clientConsent
    ) {
      throw new ForbiddenException('No audio for this visit');
    }
    if (
      recording.uploadStatus !== RecordingUploadStatus.UPLOADED ||
      !recording.storageKey
    ) {
      throw new NotFoundException('Audio not available');
    }
  }

  private assertCompanyAccess(user: User, companyId: string | null) {
    const allowed = resolveCompanyIds(user, companyId ?? undefined);
    if (allowed === undefined) return; // admin all
    if (!companyId || !allowed.includes(companyId)) {
      throw new ForbiddenException('Company access denied');
    }
  }

  private async requireOwnVisit(distributorId: string, visitId: string) {
    const visit = await this.visitRepo.findOne({ where: { id: visitId } });
    if (!visit || visit.distributorId !== distributorId) {
      throw new NotFoundException('Visit not found');
    }
    return visit;
  }

  private async requireOwnRecording(distributorId: string, recordingId: string) {
    const recording = await this.recordingRepo.findOne({ where: { id: recordingId } });
    if (!recording || recording.distributorId !== distributorId) {
      throw new NotFoundException('Recording not found');
    }
    return recording;
  }

  private parseOutcome(raw?: string | null): VisitRecordingOutcome {
    switch ((raw || '').toLowerCase()) {
      case 'with_order':
        return VisitRecordingOutcome.WITH_ORDER;
      case 'without_order':
        return VisitRecordingOutcome.WITHOUT_ORDER;
      case 'cancelled':
        return VisitRecordingOutcome.CANCELLED;
      default:
        return VisitRecordingOutcome.UNKNOWN;
    }
  }

  private toDto(r: VisitRecording) {
    const expired =
      r.status === RecordingStatus.EXPIRED || r.expiresAt.getTime() <= Date.now();
    return {
      id: r.id,
      visitId: r.visitId,
      distributorId: r.distributorId,
      companyId: r.companyId,
      clientId: r.clientId,
      orderId: r.orderId,
      startedAt: r.startedAt.toISOString(),
      endedAt: r.endedAt?.toISOString() ?? null,
      durationSeconds: r.durationSeconds,
      status: expired ? RecordingStatus.EXPIRED : r.status,
      uploadStatus: r.uploadStatus,
      visitOutcome: r.visitOutcome,
      clientConsent: r.clientConsent,
      expiresAt: r.expiresAt.toISOString(),
      hasAudio:
        !expired &&
        r.uploadStatus === RecordingUploadStatus.UPLOADED &&
        !!r.storageKey,
      fileSizeBytes: r.fileSizeBytes != null ? Number(r.fileSizeBytes) : null,
      mimeType: r.mimeType,
      failureReason: r.failureReason,
    };
  }

  private async enrichList(
    rows: VisitRecording[],
    opts: { maskExpiredAudio?: boolean; includeAgent?: boolean },
  ) {
    if (!rows.length) return [];
    const clientIds = [...new Set(rows.map((r) => r.clientId))];
    const orderIds = rows.map((r) => r.orderId).filter((id): id is string => !!id);
    const visitIds = rows.map((r) => r.visitId);
    const distributorIds = [...new Set(rows.map((r) => r.distributorId))];

    const [clients, orders, visits, profiles] = await Promise.all([
      this.clientRepo.find({ where: { id: In(clientIds) } }),
      orderIds.length
        ? this.orderRepo.find({ where: { id: In(orderIds) } })
        : Promise.resolve([] as Order[]),
      this.visitRepo.find({ where: { id: In(visitIds) } }),
      opts.includeAgent
        ? this.profileRepo.find({
            where: { id: In(distributorIds) },
            relations: ['user'],
          })
        : Promise.resolve([] as DistributorProfile[]),
    ]);

    const clientMap = new Map(clients.map((c) => [c.id, c]));
    const orderMap = new Map(orders.map((o) => [o.id, o]));
    const visitMap = new Map(visits.map((v) => [v.id, v]));
    const agentMap = new Map(
      profiles.map((p) => [p.id, p.user?.fullName ?? p.phone ?? p.id]),
    );

    // Also try to find orders by visitId if orderId missing
    const ordersByVisit = await this.orderRepo.find({
      where: { visitId: In(visitIds) },
    });
    const orderByVisit = new Map(
      ordersByVisit.filter((o) => o.visitId).map((o) => [o.visitId as string, o]),
    );

    return rows.map((r) => {
      const base = this.toDto(r);
      const client = clientMap.get(r.clientId);
      const visit = visitMap.get(r.visitId);
      const order =
        (r.orderId ? orderMap.get(r.orderId) : undefined) ??
        orderByVisit.get(r.visitId);
      const expired =
        base.status === RecordingStatus.EXPIRED ||
        r.expiresAt.getTime() <= Date.now();

      return {
        ...base,
        clientName: client?.name ?? 'Klient',
        clientCode: client?.code ?? '',
        orderNumber: order?.id ?? null,
        orderTotal: order
          ? Number(order.totalAmount)
          : visit
            ? Number(visit.orderTotal)
            : 0,
        visitStatus: visit?.status ?? null,
        agentName: opts.includeAgent ? agentMap.get(r.distributorId) ?? null : undefined,
        audioState: expired
          ? 'expired'
          : base.hasAudio
            ? 'ready'
            : r.uploadStatus === RecordingUploadStatus.PENDING ||
                r.uploadStatus === RecordingUploadStatus.UPLOADING
              ? 'pending_upload'
              : r.status === RecordingStatus.INTERRUPTED
                ? 'interrupted'
                : r.status === RecordingStatus.FAILED
                  ? 'error'
                  : r.status === RecordingStatus.RECORDING
                    ? 'recording'
                    : 'unavailable',
      };
    });
  }
}

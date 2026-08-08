import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ClientRequest,
  ClientRequestStatus,
  ClientRequestType,
} from './entities/client-request.entity';
import { CreateClientRequestDto } from './dto/client-request.dto';
import { ClientsService } from './clients.service';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';
import { User } from '../auth/entities/user.entity';

function normalizeInn(inn?: string | null): string | null {
  const v = inn?.trim();
  return v ? v : null;
}

@Injectable()
export class ClientRequestsService {
  constructor(
    @InjectRepository(ClientRequest)
    private readonly repo: Repository<ClientRequest>,
    private readonly clientsService: ClientsService,
  ) {}

  private baseQuery() {
    return this.repo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.distributor', 'distributor')
      .leftJoinAndSelect('distributor.user', 'agentUser');
  }

  async findPending(companyId?: string) {
    const qb = this.baseQuery().where('r.status = :status', {
      status: ClientRequestStatus.PENDING,
    });
    if (companyId) {
      qb.andWhere('(r.companyId = :companyId OR r.companyId IS NULL)', {
        companyId,
      });
    }
    return qb.orderBy('r.createdAt', 'DESC').getMany();
  }

  async findOne(id: string) {
    const row = await this.baseQuery().where('r.id = :id', { id }).getOne();
    if (!row) throw new NotFoundException('Client request not found');
    return row;
  }

  async checkInnDuplicate(
    inn?: string | null,
    excludeRequestId?: string,
    excludeClientId?: string,
  ) {
    const normalized = normalizeInn(inn);
    if (!normalized) {
      return { duplicate: false as const, existingClient: null, existingRequest: null };
    }

    const existingClient = await this.clientsService.findByInn(normalized);
    if (existingClient && existingClient.id !== excludeClientId) {
      return {
        duplicate: true as const,
        existingClient,
        existingRequest: null,
        reason: 'client_exists' as const,
      };
    }

    const qb = this.repo
      .createQueryBuilder('r')
      .where('r.inn = :inn', { inn: normalized })
      .andWhere('r.status = :status', { status: ClientRequestStatus.PENDING });
    if (excludeRequestId) {
      qb.andWhere('r.id != :excludeRequestId', { excludeRequestId });
    }
    const existingRequest = await qb.getOne();
    if (existingRequest) {
      return {
        duplicate: true as const,
        existingClient: null,
        existingRequest,
        reason: 'request_exists' as const,
      };
    }

    return { duplicate: false as const, existingClient: null, existingRequest: null };
  }

  async create(
    dto: CreateClientRequestDto,
    distributorId?: string,
    agentName?: string,
  ) {
    const dup = await this.checkInnDuplicate(dto.inn);
    if (dup.duplicate) {
      throw new BadRequestException(
        dup.reason === 'client_exists'
          ? 'Bu INN bilan mijoz tizimda mavjud'
          : 'Bu INN bilan kutilayotgan so\'rov mavjud',
      );
    }

    const row = this.repo.create({
      status: ClientRequestStatus.PENDING,
      requestType: ClientRequestType.CREATE,
      targetClientId: null,
      distributorId: distributorId ?? null,
      companyId: dto.companyId ?? null,
      name: dto.name,
      fullName: dto.fullName ?? dto.name,
      phone: dto.phone ?? null,
      address: dto.address ?? null,
      lineCode: dto.lineCode ?? null,
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      category: dto.category ?? 'Standard',
      inn: normalizeInn(dto.inn),
      contactPerson: dto.contactPerson ?? null,
      territory: dto.territory ?? null,
      clientClass: dto.clientClass ?? null,
      priceCategory: dto.priceCategory ?? null,
      photoUrl: dto.photoUrl ?? null,
      canSeePromotions: dto.canSeePromotions === true,
      agentName: agentName ?? null,
      note: dto.note ?? null,
    });
    const saved = await this.repo.save(row);
    return this.findOne(saved.id);
  }

  /**
   * Mavjud mijoz o‘zgarishini admin tasdigiga yuborish.
   * Bir xil mijoz uchun pending update bo‘lsa — yangilanadi.
   */
  async createUpdate(
    targetClientId: string,
    dto: UpdateClientDto,
    distributorId?: string,
    agentName?: string,
  ) {
    const existing = await this.clientsService.findOne(targetClientId);
    const companyId = existing.companyId ?? undefined;

    const merged = {
      name: dto.name ?? existing.name,
      fullName: dto.fullName ?? existing.fullName ?? existing.name,
      phone: dto.phone !== undefined ? dto.phone : existing.phone,
      address: dto.address !== undefined ? dto.address : existing.address,
      lineCode: dto.lineCode !== undefined ? dto.lineCode : existing.lineCode,
      latitude: dto.latitude !== undefined ? dto.latitude : existing.latitude,
      longitude: dto.longitude !== undefined ? dto.longitude : existing.longitude,
      category: dto.category !== undefined ? dto.category : existing.category,
      inn:
        dto.inn !== undefined
          ? normalizeInn(dto.inn)
          : normalizeInn(existing.inn),
      contactPerson:
        dto.contactPerson !== undefined
          ? dto.contactPerson
          : existing.contactPerson,
      territory: dto.territory !== undefined ? dto.territory : existing.territory,
      clientClass:
        dto.clientClass !== undefined ? dto.clientClass : existing.clientClass,
      priceCategory:
        dto.priceCategory !== undefined
          ? dto.priceCategory
          : existing.priceCategory,
      photoUrl: dto.photoUrl !== undefined ? dto.photoUrl : existing.photoUrl,
      canSeePromotions:
        dto.canSeePromotions !== undefined
          ? dto.canSeePromotions === true
          : existing.canSeePromotions === true,
    };

    const dup = await this.checkInnDuplicate(merged.inn, undefined, targetClientId);
    if (dup.duplicate) {
      throw new BadRequestException(
        dup.reason === 'client_exists'
          ? 'Bu INN bilan boshqa mijoz tizimda mavjud'
          : 'Bu INN bilan kutilayotgan so\'rov mavjud',
      );
    }

    const pendingExisting = await this.repo.findOne({
      where: {
        targetClientId,
        requestType: ClientRequestType.UPDATE,
        status: ClientRequestStatus.PENDING,
      },
    });

    if (pendingExisting) {
      pendingExisting.name = merged.name;
      pendingExisting.fullName = merged.fullName;
      pendingExisting.phone = merged.phone ?? null;
      pendingExisting.address = merged.address ?? null;
      pendingExisting.lineCode = merged.lineCode ?? null;
      pendingExisting.latitude = merged.latitude ?? null;
      pendingExisting.longitude = merged.longitude ?? null;
      pendingExisting.category = merged.category ?? null;
      pendingExisting.inn = merged.inn;
      pendingExisting.contactPerson = merged.contactPerson ?? null;
      pendingExisting.territory = merged.territory ?? null;
      pendingExisting.clientClass = merged.clientClass ?? null;
      pendingExisting.priceCategory = merged.priceCategory ?? null;
      pendingExisting.photoUrl = merged.photoUrl ?? null;
      pendingExisting.canSeePromotions = merged.canSeePromotions === true;
      pendingExisting.agentName = agentName ?? pendingExisting.agentName;
      pendingExisting.distributorId =
        distributorId ?? pendingExisting.distributorId;
      pendingExisting.companyId = companyId ?? pendingExisting.companyId;
      await this.repo.save(pendingExisting);
      return this.findOne(pendingExisting.id);
    }

    const row = this.repo.create({
      status: ClientRequestStatus.PENDING,
      requestType: ClientRequestType.UPDATE,
      targetClientId,
      distributorId: distributorId ?? null,
      companyId: companyId ?? null,
      name: merged.name,
      fullName: merged.fullName,
      phone: merged.phone ?? null,
      address: merged.address ?? null,
      lineCode: merged.lineCode ?? null,
      latitude: merged.latitude ?? null,
      longitude: merged.longitude ?? null,
      category: merged.category ?? null,
      inn: merged.inn,
      contactPerson: merged.contactPerson ?? null,
      territory: merged.territory ?? null,
      clientClass: merged.clientClass ?? null,
      priceCategory: merged.priceCategory ?? null,
      photoUrl: merged.photoUrl ?? null,
      canSeePromotions: merged.canSeePromotions === true,
      agentName: agentName ?? null,
      note: null,
    });
    const saved = await this.repo.save(row);
    return this.findOne(saved.id);
  }

  async approve(id: string, reviewerName: string, actor?: User) {
    const request = await this.findOne(id);
    if (request.status !== ClientRequestStatus.PENDING) {
      throw new BadRequestException('So\'rov allaqachon ko\'rib chiqilgan');
    }

    const isUpdate = request.requestType === ClientRequestType.UPDATE;
    const excludeClientId = isUpdate ? request.targetClientId ?? undefined : undefined;

    const dup = await this.checkInnDuplicate(request.inn, id, excludeClientId);
    if (dup.duplicate) {
      throw new BadRequestException(
        dup.reason === 'client_exists'
          ? 'Bu INN bilan mijoz tizimda mavjud — qabul qilib bo\'lmaydi'
          : 'Bu INN bilan boshqa kutilayotgan so\'rov mavjud',
      );
    }

    if (isUpdate) {
      if (!request.targetClientId) {
        throw new BadRequestException('Tahrirlash so\'rovida mijoz ID yo\'q');
      }
      const updateDto: UpdateClientDto = {
        name: request.name,
        fullName: request.fullName ?? request.name,
        phone: request.phone ?? undefined,
        address: request.address ?? undefined,
        lineCode: request.lineCode ?? undefined,
        latitude: request.latitude ?? undefined,
        longitude: request.longitude ?? undefined,
        category: request.category ?? undefined,
        inn: request.inn ?? undefined,
        contactPerson: request.contactPerson ?? undefined,
        territory: request.territory ?? undefined,
        clientClass: request.clientClass ?? undefined,
        priceCategory: request.priceCategory ?? undefined,
        photoUrl: request.photoUrl ?? undefined,
        canSeePromotions: request.canSeePromotions === true,
      };
      const client = await this.clientsService.update(
        request.targetClientId,
        updateDto,
        actor,
      );
      request.status = ClientRequestStatus.APPROVED;
      request.approvedClientId = client.id;
      request.reviewedBy = reviewerName;
      request.reviewedAt = new Date();
      await this.repo.save(request);
      return { request: await this.findOne(id), client };
    }

    const resolvedCompanyId =
      request.companyId ?? request.distributor?.companyId ?? undefined;

    const createDto: CreateClientDto = {
      name: request.name,
      fullName: request.fullName ?? request.name,
      phone: request.phone ?? undefined,
      address: request.address ?? undefined,
      companyId: resolvedCompanyId,
      lineCode: request.lineCode ?? undefined,
      latitude: request.latitude ?? undefined,
      longitude: request.longitude ?? undefined,
      category: request.category ?? undefined,
      distributorId: request.distributorId ?? undefined,
      inn: request.inn ?? undefined,
      contactPerson: request.contactPerson ?? undefined,
      territory: request.territory ?? undefined,
      clientClass: request.clientClass ?? undefined,
      priceCategory: request.priceCategory ?? undefined,
      photoUrl: request.photoUrl ?? undefined,
      canSeePromotions: request.canSeePromotions === true,
    };

    const client = await this.clientsService.create(createDto, actor, {
      id: request.distributor?.userId ?? actor?.id ?? null,
      name: request.agentName ?? actor?.fullName ?? actor?.username ?? null,
    });
    request.status = ClientRequestStatus.APPROVED;
    request.approvedClientId = client.id;
    request.reviewedBy = reviewerName;
    request.reviewedAt = new Date();
    await this.repo.save(request);

    return { request: await this.findOne(id), client };
  }

  async reject(id: string, reviewerName: string) {
    const request = await this.findOne(id);
    if (request.status !== ClientRequestStatus.PENDING) {
      throw new BadRequestException('So\'rov allaqachon ko\'rib chiqilgan');
    }
    request.status = ClientRequestStatus.REJECTED;
    request.reviewedBy = reviewerName;
    request.reviewedAt = new Date();
    await this.repo.save(request);
    return this.findOne(id);
  }
}

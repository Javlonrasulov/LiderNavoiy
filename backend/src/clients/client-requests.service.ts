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
} from './entities/client-request.entity';
import { CreateClientRequestDto } from './dto/client-request.dto';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/client.dto';

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

  async checkInnDuplicate(inn?: string | null, excludeRequestId?: string) {
    const normalized = normalizeInn(inn);
    if (!normalized) {
      return { duplicate: false as const, existingClient: null, existingRequest: null };
    }

    const existingClient = await this.clientsService.findByInn(normalized);
    if (existingClient) {
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
      agentName: agentName ?? null,
      note: dto.note ?? null,
    });
    const saved = await this.repo.save(row);
    return this.findOne(saved.id);
  }

  async approve(id: string, reviewerName: string) {
    const request = await this.findOne(id);
    if (request.status !== ClientRequestStatus.PENDING) {
      throw new BadRequestException('So\'rov allaqachon ko\'rib chiqilgan');
    }

    const dup = await this.checkInnDuplicate(request.inn, id);
    if (dup.duplicate) {
      throw new BadRequestException(
        dup.reason === 'client_exists'
          ? 'Bu INN bilan mijoz tizimda mavjud — qabul qilib bo\'lmaydi'
          : 'Bu INN bilan boshqa kutilayotgan so\'rov mavjud',
      );
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
    };

    const client = await this.clientsService.create(createDto);
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

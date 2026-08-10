import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './entities/company.entity';
import { DistributorProfile } from '../distributors/entities/distributor-profile.entity';
import { Client } from '../clients/entities/client.entity';
import { User } from '../auth/entities/user.entity';
import { UserRole } from '../common/enums';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

export interface CompanyListItem {
  id: string;
  name: string;
  shortName: string | null;
  icon: string | null;
  color: string | null;
  imageUrl: string | null;
  description: string | null;
  productType: string;
  warehouseName: string | null;
  agentsCanAddClients: boolean;
  clientsAddWithoutApproval: boolean;
  agents: number;
  clients: number;
}

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(DistributorProfile)
    private readonly profileRepo: Repository<DistributorProfile>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
  ) {}

  private toListItem(
    company: Company,
    agents: number,
    clients: number,
  ): CompanyListItem {
    return {
      id: company.id,
      name: company.name,
      shortName: company.shortName,
      icon: company.icon,
      color: company.color,
      imageUrl: company.imageUrl ?? null,
      description: company.description,
      productType: company.productType || 'kg_dona',
      warehouseName: company.warehouseName ?? null,
      agentsCanAddClients: !!company.agentsCanAddClients,
      clientsAddWithoutApproval: !!company.clientsAddWithoutApproval,
      agents,
      clients,
    };
  }

  async findAll(): Promise<CompanyListItem[]> {
    const companies = await this.companyRepo.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });

    const items = await Promise.all(
      companies.map(async (company) => {
        const [agents, clients] = await Promise.all([
          this.profileRepo
            .createQueryBuilder('d')
            .innerJoin(User, 'u', 'u.id = d.userId')
            .where('d.companyId = :companyId', { companyId: company.id })
            .andWhere('u.role = :role', { role: UserRole.DISTRIBUTOR })
            .andWhere('u.isActive = true')
            .getCount(),
          this.clientRepo.count({
            where: { companyId: company.id, isActive: true },
          }),
        ]);

        return this.toListItem(company, agents, clients);
      }),
    );

    return items;
  }

  async getAgentsCanAddClients(companyId: string | null | undefined): Promise<boolean> {
    if (!companyId) return false;
    const company = await this.companyRepo.findOne({
      where: { id: companyId, isActive: true },
      select: ['id', 'agentsCanAddClients'],
    });
    return !!company?.agentsCanAddClients;
  }

  async assertAgentsCanAddClients(companyId: string | null | undefined): Promise<void> {
    const allowed = await this.getAgentsCanAddClients(companyId);
    if (!allowed) {
      throw new ForbiddenException(
        'Mijoz qo‘shish admin tomonidan ruxsat etilmagan',
      );
    }
  }

  async getClientsAddWithoutApproval(
    companyId: string | null | undefined,
  ): Promise<boolean> {
    if (!companyId) return false;
    const company = await this.companyRepo.findOne({
      where: { id: companyId, isActive: true },
      select: ['id', 'clientsAddWithoutApproval'],
    });
    return !!company?.clientsAddWithoutApproval;
  }

  async create(dto: CreateCompanyDto): Promise<CompanyListItem> {
    const id = `org_${Date.now()}`;
    const shortName =
      dto.shortName?.trim() ||
      dto.name.trim().split(/\s+/)[0] ||
      dto.name.trim();
    const saved = await this.companyRepo.save(
      this.companyRepo.create({
        id,
        name: dto.name.trim(),
        shortName,
        icon: dto.icon ?? '🏢',
        color: dto.color ?? 'from-indigo-500 to-blue-600',
        imageUrl: dto.imageUrl?.trim() || null,
        description: dto.description?.trim() || null,
        productType: dto.productType ?? 'kg_dona',
        agentsCanAddClients: dto.agentsCanAddClients ?? false,
        clientsAddWithoutApproval: dto.clientsAddWithoutApproval ?? false,
        isActive: true,
      }),
    );
    return this.toListItem(saved, 0, 0);
  }

  async update(id: string, dto: UpdateCompanyDto): Promise<CompanyListItem> {
    const company = await this.companyRepo.findOne({ where: { id, isActive: true } });
    if (!company) throw new NotFoundException('Organization not found');

    if (dto.name !== undefined) company.name = dto.name.trim();
    if (dto.shortName !== undefined) company.shortName = dto.shortName.trim() || null;
    if (dto.icon !== undefined) company.icon = dto.icon;
    if (dto.color !== undefined) company.color = dto.color;
    if (dto.imageUrl !== undefined) company.imageUrl = dto.imageUrl?.trim() || null;
    if (dto.description !== undefined) company.description = dto.description.trim() || null;
    if (dto.productType !== undefined) company.productType = dto.productType;
    if (dto.warehouseName !== undefined) company.warehouseName = dto.warehouseName.trim() || null;
    if (dto.agentsCanAddClients !== undefined) {
      company.agentsCanAddClients = dto.agentsCanAddClients;
    }
    if (dto.clientsAddWithoutApproval !== undefined) {
      company.clientsAddWithoutApproval = dto.clientsAddWithoutApproval;
    }

    await this.companyRepo.save(company);
    const found = (await this.findAll()).find((c) => c.id === id);
    if (!found) throw new NotFoundException('Organization not found');
    return found;
  }
}

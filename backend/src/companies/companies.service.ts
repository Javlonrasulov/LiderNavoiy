import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
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
  description: string | null;
  productType: string;
  warehouseName: string | null;
  agents: number;
  clients: number;
}

@Injectable()
export class CompaniesService implements OnModuleInit {
  private readonly defaults = [
    {
      id: 'boran',
      name: 'Boran Leaders+ Darveshi Navoiy',
      shortName: 'Boran Leaders+',
      icon: '🏢',
      color: 'from-red-600 to-rose-700',
      description: 'Savdo va distribyutsiya',
      productType: 'kg_dona',
    },
    {
      id: 'zarafshon',
      name: 'Зарафшон Шерин',
      shortName: 'Зарафшон',
      icon: '🌿',
      color: 'from-blue-500 to-cyan-600',
      description: 'Oziq-ovqat mahsulotlari',
      productType: 'kg_dona',
    },
  ];

  constructor(
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(DistributorProfile)
    private readonly profileRepo: Repository<DistributorProfile>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
  ) {}

  async onModuleInit() {
    const count = await this.companyRepo.count();
    if (count > 0) return;
    await this.companyRepo.save(
      this.defaults.map((item) =>
        this.companyRepo.create({ ...item, isActive: true }),
      ),
    );
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

        return {
          id: company.id,
          name: company.name,
          shortName: company.shortName,
          icon: company.icon,
          color: company.color,
          description: company.description,
          productType: company.productType || 'kg_dona',
          warehouseName: company.warehouseName ?? null,
          agents,
          clients,
        };
      }),
    );

    return items;
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
        description: dto.description?.trim() || null,
        productType: dto.productType ?? 'kg_dona',
        isActive: true,
      }),
    );
    return {
      id: saved.id,
      name: saved.name,
      shortName: saved.shortName,
      icon: saved.icon,
      color: saved.color,
      description: saved.description,
      productType: saved.productType || 'kg_dona',
      warehouseName: saved.warehouseName ?? null,
      agents: 0,
      clients: 0,
    };
  }

  async update(id: string, dto: UpdateCompanyDto): Promise<CompanyListItem> {
    const company = await this.companyRepo.findOne({ where: { id, isActive: true } });
    if (!company) throw new NotFoundException('Organization not found');

    if (dto.name !== undefined) company.name = dto.name.trim();
    if (dto.shortName !== undefined) company.shortName = dto.shortName.trim() || null;
    if (dto.icon !== undefined) company.icon = dto.icon;
    if (dto.color !== undefined) company.color = dto.color;
    if (dto.description !== undefined) company.description = dto.description.trim() || null;
    if (dto.productType !== undefined) company.productType = dto.productType;
    if (dto.warehouseName !== undefined) company.warehouseName = dto.warehouseName.trim() || null;

    await this.companyRepo.save(company);
    const found = (await this.findAll()).find((c) => c.id === id);
    if (!found) throw new NotFoundException('Organization not found');
    return found;
  }
}

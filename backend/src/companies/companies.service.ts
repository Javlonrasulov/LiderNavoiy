import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './entities/company.entity';
import { DistributorProfile } from '../distributors/entities/distributor-profile.entity';
import { Client } from '../clients/entities/client.entity';
import { User } from '../auth/entities/user.entity';
import { UserRole } from '../common/enums';

export interface CompanyListItem {
  id: string;
  name: string;
  shortName: string | null;
  icon: string | null;
  color: string | null;
  description: string | null;
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
    },
    {
      id: 'zarafshon',
      name: 'Зарафшон Шерин',
      shortName: 'Зарафшон',
      icon: '🌿',
      color: 'from-blue-500 to-cyan-600',
      description: 'Oziq-ovqat mahsulotlari',
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
          agents,
          clients,
        };
      }),
    );

    return items;
  }
}

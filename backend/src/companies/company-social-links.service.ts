import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './entities/company.entity';
import { CompanySocialLink } from './entities/company-social-link.entity';
import {
  CreateCompanySocialLinkDto,
  UpdateCompanySocialLinkDto,
} from './dto/company-social-link.dto';

@Injectable()
export class CompanySocialLinksService {
  constructor(
    @InjectRepository(CompanySocialLink)
    private readonly repo: Repository<CompanySocialLink>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
  ) {}

  private async assertCompany(companyId: string) {
    const company = await this.companyRepo.findOne({
      where: { id: companyId, isActive: true },
    });
    if (!company) throw new NotFoundException('Organization not found');
  }

  findAll(companyId: string) {
    return this.repo.find({
      where: { companyId },
      order: { createdAt: 'ASC' },
    });
  }

  async create(companyId: string, dto: CreateCompanySocialLinkDto) {
    await this.assertCompany(companyId);
    const row = this.repo.create({
      companyId,
      name: dto.name.trim(),
      url: dto.url.trim(),
    });
    return this.repo.save(row);
  }

  async update(companyId: string, id: string, dto: UpdateCompanySocialLinkDto) {
    await this.assertCompany(companyId);
    const row = await this.repo.findOne({ where: { id, companyId } });
    if (!row) throw new NotFoundException('Social link not found');
    if (dto.name !== undefined) row.name = dto.name.trim();
    if (dto.url !== undefined) row.url = dto.url.trim();
    return this.repo.save(row);
  }

  async remove(companyId: string, id: string) {
    await this.assertCompany(companyId);
    const row = await this.repo.findOne({ where: { id, companyId } });
    if (!row) throw new NotFoundException('Social link not found');
    await this.repo.remove(row);
    return { ok: true };
  }
}

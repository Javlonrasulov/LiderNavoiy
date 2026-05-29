import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly repo: Repository<Product>,
  ) {}

  findAll(category?: string) {
    const qb = this.repo.createQueryBuilder('p').where('p.isActive = true');
    if (category) qb.andWhere('p.category = :category', { category });
    return qb.orderBy('p.name', 'ASC').getMany();
  }

  findOne(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  getCategories() {
    return this.repo
      .createQueryBuilder('p')
      .select('DISTINCT p.category', 'category')
      .where('p.category IS NOT NULL')
      .getRawMany();
  }
}

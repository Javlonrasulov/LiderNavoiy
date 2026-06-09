import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
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

  findInStock(category?: string) {
    const qb = this.repo
      .createQueryBuilder('p')
      .where('p.isActive = true')
      .andWhere('p.stockBalance > 0');
    if (category) qb.andWhere('p.category = :category', { category });
    return qb.orderBy('p.name', 'ASC').getMany();
  }

  async findInStockMap(): Promise<Map<string, Product>> {
    const products = await this.findInStock();
    return new Map(products.map((p) => [p.id, p]));
  }

  async findActiveMaps(): Promise<{ byId: Map<string, Product>; byCode: Map<string, Product> }> {
    const products = await this.findAll();
    return {
      byId: new Map(products.map((p) => [p.id, p])),
      byCode: new Map(products.map((p) => [p.code, p])),
    };
  }

  findOne(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  getCategories(inStockOnly = false) {
    const qb = this.repo
      .createQueryBuilder('p')
      .select('DISTINCT p.category', 'category')
      .where('p.category IS NOT NULL')
      .andWhere('p.isActive = true');
    if (inStockOnly) qb.andWhere('p.stockBalance > 0');
    return qb.orderBy('p.category', 'ASC').getRawMany();
  }

  async create(dto: CreateProductDto) {
    const exists = await this.repo.findOne({ where: { code: dto.code } });
    if (exists) throw new ConflictException('Product code already exists');
    const product = this.repo.create({
      code: dto.code,
      name: dto.name,
      category: dto.category ?? null,
      brand: dto.brand ?? null,
      price: dto.price,
      unit: dto.unit,
      stockBalance: dto.stockBalance ?? 0,
      imageUrl: dto.imageUrl ?? null,
      isActive: true,
    });
    return this.repo.save(product);
  }

  async update(id: string, dto: UpdateProductDto) {
    const product = await this.repo.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    if (dto.code && dto.code !== product.code) {
      const exists = await this.repo.findOne({ where: { code: dto.code } });
      if (exists) throw new ConflictException('Product code already exists');
    }
    Object.assign(product, {
      ...dto,
      category: dto.category === undefined ? product.category : dto.category,
      brand: dto.brand === undefined ? product.brand : dto.brand,
      imageUrl: dto.imageUrl === undefined ? product.imageUrl : dto.imageUrl,
    });
    return this.repo.save(product);
  }

  async remove(id: string) {
    const product = await this.repo.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    product.isActive = false;
    return this.repo.save(product);
  }
}

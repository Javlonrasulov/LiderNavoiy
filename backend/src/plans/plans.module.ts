import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentPlan } from './entities/agent-plan.entity';
import { PlansService } from './plans.service';
import { PlansController } from './plans.controller';
import { Order } from '../orders/entities/order.entity';
import { Product } from '../products/entities/product.entity';
import { ProductCategory } from '../products/entities/product-category.entity';
import { DistributorProfile } from '../distributors/entities/distributor-profile.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      AgentPlan,
      Order,
      Product,
      ProductCategory,
      DistributorProfile,
    ]),
  ],
  controllers: [PlansController],
  providers: [PlansService],
  exports: [PlansService],
})
export class PlansModule {}

import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { DistributorsModule } from './distributors/distributors.module';
import { GpsModule } from './gps/gps.module';
import { RoutesModule } from './routes/routes.module';
import { VisitsModule } from './visits/visits.module';
import { ClientsModule } from './clients/clients.module';
import { OrdersModule } from './orders/orders.module';
import { NotificationsModule } from './notifications/notifications.module';
import { TrackingModule } from './tracking/tracking.module';
import { ProductsModule } from './products/products.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { HealthModule } from './health/health.module';
import { MessagesModule } from './messages/messages.module';
import { UsersModule } from './users/users.module';
import { LinesModule } from './lines/lines.module';
import { ClientCategoriesModule } from './client-categories/client-categories.module';
import { ExchangeRatesModule } from './exchange-rates/exchange-rates.module';
import { CompaniesModule } from './companies/companies.module';
import { PlansModule } from './plans/plans.module';
import { PromotionsModule } from './promotions/promotions.module';
import { TerminalsModule } from './terminals/terminals.module';
import { PaymentsModule } from './payments/payments.module';
import { ReturnsModule } from './returns/returns.module';
import { RedisModule } from './common/redis/redis.module';
import { User } from './auth/entities/user.entity';
import { Company } from './companies/entities/company.entity';
import { Client } from './clients/entities/client.entity';
import { DistributorProfile } from './distributors/entities/distributor-profile.entity';
import { BootSeedService } from './common/boot-seed.service';
import { PermissionsGuard } from './common/guards/permissions.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120,
      },
    ]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): TypeOrmModuleOptions => {
        const databaseUrl = config.get<string>('DATABASE_URL');
        const sync =
          config.get('TYPEORM_SYNC') === 'true' ||
          config.get('NODE_ENV') !== 'production';

        if (databaseUrl) {
          return {
            type: 'postgres',
            url: databaseUrl,
            ssl: { rejectUnauthorized: false },
            autoLoadEntities: true,
            synchronize: sync,
            logging: config.get('NODE_ENV') === 'development',
          };
        }

        return {
          type: 'postgres',
          host: config.get<string>('DB_HOST', 'localhost'),
          port: config.get<number>('DB_PORT', 5432),
          username: config.get<string>('DB_USERNAME', 'crm_user'),
          password: config.get<string>('DB_PASSWORD', 'crm_password'),
          database: config.get<string>('DB_DATABASE', 'distributor_crm'),
          autoLoadEntities: true,
          synchronize: sync,
          logging: config.get('NODE_ENV') === 'development',
        };
      },
    }),
    TypeOrmModule.forFeature([User, Company, Client, DistributorProfile]),
    RedisModule,
    AuthModule,
    DistributorsModule,
    GpsModule,
    RoutesModule,
    VisitsModule,
    ClientsModule,
    OrdersModule,
    NotificationsModule,
    TrackingModule,
    ProductsModule,
    DashboardModule,
    HealthModule,
    MessagesModule,
    UsersModule,
    LinesModule,
    ClientCategoriesModule,
    ExchangeRatesModule,
    CompaniesModule,
    PlansModule,
    PromotionsModule,
    TerminalsModule,
    PaymentsModule,
    ReturnsModule,
  ],
  providers: [
    BootSeedService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}

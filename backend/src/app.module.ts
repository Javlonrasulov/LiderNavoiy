import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
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
import { ExchangeRatesModule } from './exchange-rates/exchange-rates.module';
import { RedisModule } from './common/redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get('DB_USERNAME', 'crm_user'),
        password: config.get('DB_PASSWORD', 'crm_password'),
        database: config.get('DB_DATABASE', 'distributor_crm'),
        autoLoadEntities: true,
        synchronize: config.get('NODE_ENV') !== 'production',
        logging: config.get('NODE_ENV') === 'development',
      }),
    }),
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
    ExchangeRatesModule,
  ],
})
export class AppModule {}

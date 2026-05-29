import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { TrackingGateway } from './tracking.gateway';

@Module({
  imports: [ConfigModule, JwtModule.register({})],
  providers: [TrackingGateway],
  exports: [TrackingGateway],
})
export class TrackingModule {}

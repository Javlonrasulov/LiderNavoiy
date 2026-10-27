import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { User } from './entities/user.entity';
import { UserLoginDevice } from './entities/user-login-device.entity';
import { LoginAttempt } from './entities/login-attempt.entity';
import { DistributorProfile } from '../distributors/entities/distributor-profile.entity';
import { Company } from '../companies/entities/company.entity';
import { RedisModule } from '../common/redis/redis.module';
import { SessionStoreService } from './session-store.service';
import { LoginSecurityService } from './login-security.service';

function jwtSecret(config: ConfigService): string {
  const secret = config.get<string>('JWT_SECRET');
  const isProd = config.get('NODE_ENV') === 'production';
  if (!secret || (isProd && (secret === 'dev-secret' || secret.length < 16))) {
    throw new Error('JWT_SECRET must be set to a strong value in production');
  }
  return secret || 'dev-secret';
}

@Module({
  imports: [
    RedisModule,
    TypeOrmModule.forFeature([User, UserLoginDevice, LoginAttempt, DistributorProfile, Company]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: jwtSecret(config),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '4h') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, SessionStoreService, LoginSecurityService],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService, JwtPayload } from '../auth.service';
import { User } from '../entities/user.entity';

function requireJwtSecret(config: ConfigService): string {
  const secret = config.get<string>('JWT_SECRET');
  const isProd = config.get('NODE_ENV') === 'production';
  if (!secret || (isProd && (secret === 'dev-secret' || secret.length < 16))) {
    throw new Error('JWT_SECRET must be set to a strong value in production');
  }
  return secret || 'dev-secret';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: requireJwtSecret(config),
    });
  }

  async validate(payload: JwtPayload): Promise<User & { sid: string }> {
    if (payload.typ === 'refresh') {
      throw new UnauthorizedException();
    }
    const user = await this.authService.validateUser(payload);
    if (!user || !payload.sid) throw new UnauthorizedException();
    return Object.assign(user, { sid: payload.sid });
  }
}

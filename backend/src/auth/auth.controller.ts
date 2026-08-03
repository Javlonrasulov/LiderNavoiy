import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Res,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request as ExpressRequest, Response } from 'express';
import { AuthService } from './auth.service';
import {
  ChangePasswordDto,
  LoginDto,
  RefreshTokenDto,
  AuthResponseDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { User } from './entities/user.entity';
import {
  REFRESH_COOKIE_NAME,
  clearRefreshCookie,
  clientIp,
  setRefreshCookie,
} from './auth-cookies';

type AuthedRequest = ExpressRequest & {
  user: User & { sid?: string };
};

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Login with username and password' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const meta = {
      ip: clientIp(req),
      userAgent: typeof req.headers['user-agent'] === 'string'
        ? req.headers['user-agent'].slice(0, 512)
        : null,
    };
    const result = await this.authService.login(dto, meta);
    setRefreshCookie(res, req, result.refreshToken, this.authService.refreshMaxAgeMs());
    return result;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Refresh access token (cookie or body)' })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const cookieToken =
      (req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined) || undefined;
    const refreshToken = cookieToken || dto.refreshToken;
    const meta = {
      ip: clientIp(req),
      userAgent: typeof req.headers['user-agent'] === 'string'
        ? req.headers['user-agent'].slice(0, 512)
        : null,
    };
    const result = await this.authService.refresh(refreshToken, dto.device, meta);
    setRefreshCookie(res, req, result.refreshToken, this.authService.refreshMaxAgeMs());
    return result;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout and revoke refresh session(s)' })
  async logout(
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: Response,
    @Body() body: { all?: boolean } = {},
  ): Promise<void> {
    let userId: string | undefined;
    let sessionId: string | undefined;
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) {
      const payload = this.authService.decodeToken(auth.slice(7));
      userId = payload?.sub;
      sessionId = payload?.sid;
    }
    if (!sessionId) {
      const cookieToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
      if (cookieToken) {
        const payload = this.authService.decodeToken(cookieToken);
        userId = userId || payload?.sub;
        sessionId = payload?.sid;
      }
    }
    await this.authService.logout(userId, sessionId, Boolean(body?.all));
    clearRefreshCookie(res, req);
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List active sessions for current user' })
  listSessions(@Request() req: AuthedRequest) {
    const sid = (req.user as User & { sid?: string }).sid;
    return this.authService.listSessions(req.user.id, sid);
  }

  @Delete('sessions/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a session' })
  async revokeSession(
    @Request() req: AuthedRequest,
    @Param('id') id: string,
  ): Promise<void> {
    await this.authService.revokeSession(req.user.id, id);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Change password for the authenticated user' })
  changePassword(
    @Request() req: { user: User },
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    return this.authService.changePassword(req.user.id, dto);
  }
}

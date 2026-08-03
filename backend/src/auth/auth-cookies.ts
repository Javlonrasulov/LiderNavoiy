import { CookieOptions, Request, Response } from 'express';

export const REFRESH_COOKIE_NAME = 'refresh_token';

export function isHttpsRequest(req: Request): boolean {
  const proto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  if (proto === 'https') return true;
  return Boolean(req.secure);
}

export function refreshCookieOptions(req: Request, maxAgeMs: number): CookieOptions {
  return {
    httpOnly: true,
    secure: isHttpsRequest(req),
    sameSite: 'strict',
    path: '/api/v1/auth',
    maxAge: maxAgeMs,
  };
}

export function setRefreshCookie(res: Response, req: Request, token: string, maxAgeMs: number) {
  res.cookie(REFRESH_COOKIE_NAME, token, refreshCookieOptions(req, maxAgeMs));
}

export function clearRefreshCookie(res: Response, req: Request) {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: isHttpsRequest(req),
    sameSite: 'strict',
    path: '/api/v1/auth',
  });
}

export function clientIp(req: Request): string {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.length) {
    return xf.split(',')[0].trim().slice(0, 64);
  }
  return (req.ip || req.socket.remoteAddress || 'unknown').slice(0, 64);
}

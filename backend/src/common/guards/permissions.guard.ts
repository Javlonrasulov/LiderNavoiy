import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../enums';
import { User } from '../../auth/entities/user.entity';

export const PAGE_PERMISSION_KEY = 'page_permission';
export const RequirePage = (...pages: string[]) =>
  SetMetadata(PAGE_PERMISSION_KEY, pages);

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const pages = this.reflector.getAllAndOverride<string[]>(PAGE_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!pages || pages.length === 0) return true;

    const req = context.switchToHttp().getRequest<{ user?: User }>();
    const user = req.user;
    if (!user) throw new ForbiddenException();

    if (user.role === UserRole.ADMIN) return true;
    if (user.role !== UserRole.MANAGER) {
      throw new ForbiddenException('Insufficient role');
    }

    const perms = user.permissions || [];
    const ok = pages.some((p) => {
      if (perms.includes(p)) return true;
      if (p === 'unpreparedOrders' && perms.includes('tarozi')) return true;
      return false;
    });
    if (!ok) throw new ForbiddenException('Missing page permission');
    return true;
  }
}

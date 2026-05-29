import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserRole } from '../common/enums';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) throw new ForbiddenException();
    if (user.role === UserRole.ADMIN || user.role === UserRole.MANAGER) {
      return true;
    }
    throw new ForbiddenException('Admin or manager role required');
  }
}

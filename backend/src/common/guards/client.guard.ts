import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { UserRole } from '../enums';

@Injectable()
export class ClientGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest().user;
    if (user.role !== UserRole.CLIENT || !user.clientId) {
      throw new ForbiddenException('Client access only');
    }
    return true;
  }
}

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_PERMISSIONS_KEY } from './permissions.decorator';
import { AuthenticatedRequest } from './auth.guard';

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: [
    'billing.create',
    'billing.view',
    'billing.edit',
    'billing.cancel',
    'payment.create',
    'payment.view',
    'payment.refund',
    'inventory.create',
    'inventory.edit',
    'inventory.sell',
    'inventory.return',
    'metalRate.view',
    'metalRate.edit',
    'reports.view',
    'reports.export',
    'users.view',
    'users.create',
    'users.edit',
    'settings.manage',
    'audit.view',
  ],
  MANAGER: [
    'billing.create',
    'billing.view',
    'billing.edit',
    'billing.cancel',
    'payment.create',
    'payment.view',
    'inventory.create',
    'inventory.edit',
    'inventory.sell',
    'inventory.return',
    'metalRate.view',
    'metalRate.edit',
    'reports.view',
    'reports.export',
    'users.view',
  ],
  CASHIER: [
    'billing.create',
    'billing.view',
    'payment.create',
    'payment.view',
    'inventory.sell',
    'metalRate.view',
  ],
};

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      REQUIRE_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    if (!user || !user.role) {
      throw new ForbiddenException('Access denied: User credentials not found');
    }

    const userPermissions = ROLE_PERMISSIONS[user.role] || [];
    const hasAll = requiredPermissions.every((p) =>
      userPermissions.includes(p),
    );
    if (!hasAll) {
      throw new ForbiddenException('Access denied: Insufficient permissions');
    }
    return true;
  }
}

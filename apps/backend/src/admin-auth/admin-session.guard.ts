import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
// biome-ignore lint/style/useImportType: NestJS needs the runtime value for dependency injection metadata.
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { AdminService } from '../admin-session/admin-service';
// biome-ignore lint/style/useImportType: NestJS needs the runtime value for dependency injection metadata.
import { AdminAuthService } from './admin-auth.service';

const ADMIN_SERVICE_KEY = 'adminService';

/// 컨트롤러가 어느 서비스의 관리자만 허용하는지 지정한다. AdminSessionGuard와 함께 쓴다.
export const RequireAdminService = (service: AdminService) =>
  SetMetadata(ADMIN_SERVICE_KEY, service);

// 해당 서비스 세션에 로그인한 활성 관리자만 통과시킨다.
// 세션 미들웨어가 admin/<service>/* 경로마다 서비스별 세션을 붙이므로,
// 컨트롤러 경로와 RequireAdminService의 서비스가 같아야 한다.
@Injectable()
export class AdminSessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly adminAuthService: AdminAuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const service = this.reflector.getAllAndOverride<AdminService | undefined>(ADMIN_SERVICE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!service) {
      throw new Error('AdminSessionGuard requires @RequireAdminService()');
    }

    const request = context.switchToHttp().getRequest<Request>();
    const adminId = request.session?.adminId;

    if (!adminId) {
      throw new UnauthorizedException('Login required');
    }

    const admin = await this.adminAuthService.findActiveProfile(service, adminId);

    if (!admin) {
      throw new UnauthorizedException('Login required');
    }

    return true;
  }
}

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { type AdminService, ParseAdminServicePipe } from '../admin-session/admin-service';
import { getAdminSessionCookieName } from '../admin-session/admin-session';
// biome-ignore lint/style/useImportType: NestJS needs the runtime value for dependency injection metadata.
import { AdminAuthService, type AdminProfile } from './admin-auth.service';
// biome-ignore lint/style/useImportType: ValidationPipe needs the runtime DTO class.
import { AdminLoginDto } from './dto/admin-login.dto';

function regenerateSession(request: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    request.session.regenerate((error) => (error ? reject(error) : resolve()));
  });
}

function saveSession(request: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    request.session.save((error) => (error ? reject(error) : resolve()));
  });
}

function destroySession(request: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    request.session.destroy((error) => (error ? reject(error) : resolve()));
  });
}

// 경로의 :service 마다 별도 세션 미들웨어(쿠키, 세션 테이블)가 붙는다. app.module.ts 참고.
@Controller('admin/:service/auth')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Param('service', ParseAdminServicePipe) service: AdminService,
    @Body() body: AdminLoginDto,
    @Req() request: Request,
  ): Promise<AdminProfile> {
    const admin = await this.adminAuthService.login(service, body.email, body.password);

    // 세션 고정 공격을 막기 위해 로그인 성공 시 세션 ID를 새로 발급한다.
    await regenerateSession(request);
    request.session.adminId = admin.id;
    await saveSession(request);

    return admin;
  }

  @Get('me')
  async me(
    @Param('service', ParseAdminServicePipe) service: AdminService,
    @Req() request: Request,
  ): Promise<AdminProfile> {
    const adminId = request.session.adminId;

    if (!adminId) {
      throw new UnauthorizedException('Login required');
    }

    const admin = await this.adminAuthService.findActiveProfile(service, adminId);

    if (!admin) {
      await destroySession(request);
      throw new UnauthorizedException('Login required');
    }

    return admin;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Param('service', ParseAdminServicePipe) service: AdminService,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await destroySession(request);
    response.clearCookie(getAdminSessionCookieName(service), { path: '/' });
  }
}

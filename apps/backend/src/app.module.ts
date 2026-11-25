import {
  type MiddlewareConsumer,
  Module,
  type NestModule,
  RequestMethod,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_PIPE } from '@nestjs/core';
import session from 'express-session';
import { AdminAuthModule } from './admin-auth/admin-auth.module';
import { ADMIN_SERVICES } from './admin-session/admin-service';
import {
  ADMIN_SESSION_MAX_AGE_MS,
  getAdminSessionCookieName,
  getAdminSessionSecret,
} from './admin-session/admin-session';
import { AdminSessionModule } from './admin-session/admin-session.module';
// biome-ignore lint/style/useImportType: NestJS needs the runtime value for dependency injection metadata.
import { AdminSessionStoreService } from './admin-session/admin-session-store.service';
import { ChoidolsangConceptsModule } from './choidolsang/concepts/concepts.module';
import { ChoidolsangInquiriesModule } from './choidolsang/inquiries/inquiries.module';
import { ChoidolsangReservationsModule } from './choidolsang/reservations/reservations.module';
import { HealthController } from './health.controller';
import { KkiruModule } from './kkiru/kkiru.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AdminSessionModule,
    AdminAuthModule,
    ChoidolsangConceptsModule,
    ChoidolsangInquiriesModule,
    KkiruModule,
    ChoidolsangReservationsModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      }),
    },
  ],
})
export class AppModule implements NestModule {
  constructor(private readonly adminSessionStore: AdminSessionStoreService) {}

  configure(consumer: MiddlewareConsumer) {
    const isProduction = process.env.NODE_ENV === 'production';

    // 서비스마다 쿠키 이름과 세션 테이블(<service>.admin_sessions)을 분리한다.
    for (const service of ADMIN_SERVICES) {
      consumer
        .apply(
          session({
            cookie: {
              httpOnly: true,
              maxAge: ADMIN_SESSION_MAX_AGE_MS,
              // 백오피스는 /api/admin/* 를 rewrite로 넘기므로 브라우저 기준 경로 전체에 쿠키를 둔다.
              path: '/',
              sameSite: 'lax',
              secure: isProduction,
            },
            name: getAdminSessionCookieName(service),
            proxy: isProduction,
            resave: false,
            rolling: false,
            saveUninitialized: false,
            secret: getAdminSessionSecret(),
            store: this.adminSessionStore.getStore(service),
          }),
        )
        .forRoutes({ method: RequestMethod.ALL, path: `admin/${service}/{*splat}` });
    }
  }
}

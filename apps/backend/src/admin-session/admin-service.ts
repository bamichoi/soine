import { NotFoundException, type PipeTransform } from '@nestjs/common';

/// 백오피스 서비스. 값은 PostgreSQL 스키마 이름, 백오피스 경로(/choidolsang, /kkiru)와 같다.
export const ADMIN_SERVICES = ['choidolsang', 'kkiru'] as const;

export type AdminService = (typeof ADMIN_SERVICES)[number];

export function isAdminService(value: unknown): value is AdminService {
  return typeof value === 'string' && (ADMIN_SERVICES as readonly string[]).includes(value);
}

export class ParseAdminServicePipe implements PipeTransform<string, AdminService> {
  transform(value: string): AdminService {
    if (!isAdminService(value)) {
      throw new NotFoundException();
    }

    return value;
  }
}

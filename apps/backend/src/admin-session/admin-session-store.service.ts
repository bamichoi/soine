import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import connectPgSimple from 'connect-pg-simple';
import session from 'express-session';
import { ADMIN_SERVICES, type AdminService } from './admin-service';

const PostgresSessionStore = connectPgSimple(session);
type PostgresSessionStoreInstance = InstanceType<typeof PostgresSessionStore>;

// 서비스별 스키마의 admin_sessions 테이블에 세션을 저장한다.
@Injectable()
export class AdminSessionStoreService implements OnModuleDestroy {
  private readonly stores: Record<AdminService, PostgresSessionStoreInstance>;

  constructor() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL is not defined');
    }

    this.stores = Object.fromEntries(
      ADMIN_SERVICES.map((service) => [
        service,
        new PostgresSessionStore({
          conObject: { connectionString },
          createTableIfMissing: false,
          pruneSessionInterval: 15 * 60,
          schemaName: service,
          tableName: 'admin_sessions',
        }),
      ]),
    ) as Record<AdminService, PostgresSessionStoreInstance>;
  }

  getStore(service: AdminService): PostgresSessionStoreInstance {
    return this.stores[service];
  }

  onModuleDestroy() {
    for (const store of Object.values(this.stores)) {
      store.close();
    }
  }
}

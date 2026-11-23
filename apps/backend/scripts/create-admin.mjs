// 서비스별 백오피스 관리자 계정을 만든다. 계정은 서비스 스키마(<service>.admins)에 저장되며
// 서비스 간에 공유되지 않는다.
// 사용법: pnpm --filter @soine/backend admin:create -- <service> <email> <name>
//   service: choidolsang 또는 kkiru
// ADMIN_PASSWORD 환경변수가 있으면 그 값을 쓰고, 없으면 임시 비밀번호를 생성해 한 번만 출력한다.
import { randomBytes, randomUUID } from 'node:crypto';
import 'dotenv/config';
import argon2 from 'argon2';
import pg from 'pg';

const SERVICES = new Set(['choidolsang', 'kkiru']);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const [service, rawEmail, name] = process.argv
  .slice(2)
  .filter((argument) => argument !== '--')
  .map((argument) => argument.trim());
const email = rawEmail?.toLowerCase();
const connectionString = process.env.DATABASE_URL;
const providedPassword = process.env.ADMIN_PASSWORD;

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}

if (!SERVICES.has(service)) {
  fail(
    'Usage: pnpm --filter @soine/backend admin:create -- <service> <email> <name>\n' +
      'service: choidolsang or kkiru',
  );
} else if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) {
  fail('A valid email of up to 254 characters is required.');
} else if (!name || name.length > 100) {
  fail('The name must be 1-100 characters.');
} else if (
  providedPassword !== undefined &&
  (providedPassword.length < 12 || providedPassword.length > 128)
) {
  fail('ADMIN_PASSWORD must be 12-128 characters.');
} else if (!connectionString) {
  fail('DATABASE_URL is not defined.');
} else {
  const password = providedPassword ?? `${randomBytes(15).toString('base64url')}aA1!`;
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const pool = new pg.Pool({ connectionString });

  try {
    // service는 위에서 허용 목록으로 검증했으므로 스키마 이름으로 안전하게 쓸 수 있다.
    await pool.query(
      `INSERT INTO "${service}"."admins" ("id", "email", "name", "passwordHash", "updatedAt") VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [randomUUID(), email, name, passwordHash],
    );
    process.stdout.write(`Admin created.\nService: ${service}\nEmail: ${email}\nName: ${name}\n`);
    if (providedPassword === undefined) {
      process.stdout.write(
        `Temporary password: ${password}\nStore this password now. It will not be shown again.\n`,
      );
    }
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
      fail(`Admin email "${email}" already exists in ${service}.`);
    } else {
      throw error;
    }
  } finally {
    await pool.end();
  }
}

import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

function parseOrigins(value: string | undefined, fallback: string): string[] {
  return (value ?? fallback).split(',').map((origin) => origin.trim());
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const allowedOrigins = [
    ...parseOrigins(process.env.CHOIDOLSANG_WEB_URL, 'http://localhost:4000,http://127.0.0.1:4000'),
    ...parseOrigins(process.env.BACKOFFICE_URL, 'http://localhost:4002,http://127.0.0.1:4002'),
  ];

  if (process.env.NODE_ENV === 'production') {
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  }

  app.enableCors({
    credentials: true,
    origin: allowedOrigins,
  });
  await app.listen(process.env.PORT ?? 4001);
}
void bootstrap();

import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { json, urlencoded } from 'express';
import { ensureAvatarUploadDir } from './users/avatar-upload.util';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Aumenta o limite de payload para permitir importações em lote do e-SUS (default do Express é apenas 100KB)
  app.use(json({ limit: '100mb' }));
  app.use(urlencoded({ extended: true, limit: '100mb' }));

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  ensureAvatarUploadDir();

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
    setHeaders: (res) => {
      // Permite carregamento em canvas/fetch (CachedAvatar) e tags <img> entre origens
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch((err: unknown) => {
  console.error('Error starting server:', err);
});

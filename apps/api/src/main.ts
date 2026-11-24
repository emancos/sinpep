import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { json, urlencoded, Request, Response, NextFunction } from 'express';
import { ensureAvatarUploadDir } from './users/avatar-upload.util';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Remove cabeçalho X-Powered-By para reduzir fingerprinting do servidor
  app.disable('x-powered-by');

  // Cabeçalhos de segurança HTTP (equivalente ao Helmet)
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });

  // Limite elevado (100MB) restrito exclusivamente às rotas de importação em lote do e-SUS
  app.use('/regulation/esus-import/process-batch', json({ limit: '100mb' }));
  app.use('/regulation/esus-import/query', json({ limit: '100mb' }));

  // Limite global seguro para todas as demais rotas (prevenção de DoS por exaustão de memória)
  app.use(json({ limit: '5mb' }));
  app.use(urlencoded({ extended: true, limit: '5mb' }));

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      // Permite requisições sem Origin (ex: curl/Postman/healthcheck interno) ou origens autorizadas
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origem não autorizada pelo CORS: ${origin}`), false);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  ensureAvatarUploadDir();

  // Expõe estaticamente APENAS a subpasta pública de avatares (nunca a raiz de uploads)
  app.useStaticAssets(join(process.cwd(), 'uploads', 'avatars'), {
    prefix: '/uploads/avatars/',
    setHeaders: (res) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('X-Content-Type-Options', 'nosniff');
    },
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch((err: unknown) => {
  console.error('Error starting server:', err);
});

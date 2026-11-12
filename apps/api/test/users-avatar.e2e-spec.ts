import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import request from 'supertest';
import { UsersController } from '../src/users/users.controller';
import { UsersService } from '../src/users/users.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../src/auth/guards/permissions.guard';
import { ensureAvatarUploadDir } from '../src/users/avatar-upload.util';

describe('Users Avatar Upload & Static Serving (e2e)', () => {
  let app: NestExpressApplication;
  let tempRoot: string;
  let cwdSpy: jest.SpyInstance;
  let storedUser: any;

  beforeAll(async () => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sinpep-users-e2e-'));
    cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue(tempRoot);

    storedUser = {
      id: 'user-e2e-1',
      email: 'maria@ubs.gov.br',
      name: 'Maria Solicitante',
      phone: '(83) 99999-0000',
      avatar: null,
      passwordHash: 'secret-hash',
      isActive: true,
    };

    const mockUsersService = {
      findById: jest.fn(async (id: string) => (id === storedUser.id ? { ...storedUser } : null)),
      update: jest.fn(async (id: string, patch: Record<string, any>) => {
        if (id !== storedUser.id) throw new Error('User not found');
        storedUser = { ...storedUser, ...patch };
        return { ...storedUser };
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        Reflector,
        { provide: UsersService, useValue: mockUsersService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          req.user = {
            id: storedUser.id,
            email: storedUser.email,
            permissions: [],
          };
          return true;
        },
      })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.enableCors({ origin: '*', methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS', credentials: true });

    ensureAvatarUploadDir();
    app.useStaticAssets(path.join(tempRoot, 'uploads'), {
      prefix: '/uploads/',
      setHeaders: (res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      },
    });

    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await (app as INestApplication).close();
    }
    cwdSpy.mockRestore();
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it('PUT /users/profile salva avatar em pasta local uploads/avatars, remove avatar antigo ao substituir e serve com CORS', async () => {
    const pngBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+lmXcAAAAASUVORK5CYII=', 'base64');

    const firstRes = await request(app.getHttpServer())
      .put('/users/profile')
      .field('name', 'Maria Silva')
      .attach('avatar', pngBytes, { filename: 'foto1.png', contentType: 'image/png' })
      .expect(200);

    expect(firstRes.body.name).toBe('Maria Silva');
    expect(firstRes.body.passwordHash).toBeUndefined();
    expect(firstRes.body.avatar).toMatch(/^\/uploads\/avatars\/avatar-user-e2e-1-.*\.png$/);

    const firstAvatarUrl: string = firstRes.body.avatar;
    const firstDiskPath = path.join(tempRoot, firstAvatarUrl.replace(/^\//, ''));
    expect(fs.existsSync(firstDiskPath)).toBe(true);

    // Arquivo deve ser acessível via GET estático com cabeçalhos CORS para CachedAvatar
    const staticRes = await request(app.getHttpServer())
      .get(firstAvatarUrl)
      .expect(200);
    expect(staticRes.headers['access-control-allow-origin']).toBe('*');
    expect(staticRes.headers['cross-origin-resource-policy']).toBe('cross-origin');

    // Novo upload deve salvar segundo arquivo e remover o primeiro do disco
    const secondRes = await request(app.getHttpServer())
      .put('/users/profile')
      .field('name', 'Maria Silva')
      .attach('avatar', pngBytes, { filename: 'foto2.png', contentType: 'image/png' })
      .expect(200);

    expect(secondRes.body.avatar).not.toBe(firstAvatarUrl);
    const secondDiskPath = path.join(tempRoot, secondRes.body.avatar.replace(/^\//, ''));
    expect(fs.existsSync(secondDiskPath)).toBe(true);
    expect(fs.existsSync(firstDiskPath)).toBe(false);
  });

  it('PUT /users/profile rejeita arquivos que não são imagem válida', async () => {
    await request(app.getHttpServer())
      .put('/users/profile')
      .field('name', 'Maria Silva')
      .attach('avatar', Buffer.from('<script>alert(1)</script>'), {
        filename: 'evil.svg',
        contentType: 'image/svg+xml',
      })
      .expect(400);
  });
});

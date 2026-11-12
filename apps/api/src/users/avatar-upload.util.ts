import { BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';

const ALLOWED_IMAGE_MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const ALLOWED_IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

export const AVATAR_PUBLIC_PREFIX = '/uploads/avatars/';

type FileInterceptorOptions = NonNullable<Parameters<typeof FileInterceptor>[1]>;

/**
 * Resolve o diretório local em disco onde os avatares de usuários são salvos.
 */
export function getAvatarUploadDir(): string {
  return path.join(process.cwd(), 'uploads', 'avatars');
}

/**
 * Garante que o diretório local de avatares exista antes de gravar ou servir arquivos.
 */
export function ensureAvatarUploadDir(): string {
  const uploadDir = getAvatarUploadDir();
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  return uploadDir;
}

/**
 * Constrói a URL pública relativa servida pelo Express static para o avatar salvo.
 */
export function buildAvatarPublicUrl(filename: string): string {
  return `${AVATAR_PUBLIC_PREFIX}${filename}`;
}

/**
 * Retorna a configuração do Multer para persistir avatares na pasta local uploads/avatars.
 */
export function buildAvatarMulterOptions(): FileInterceptorOptions {
  return {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        cb(null, ensureAvatarUploadDir());
      },
      filename: (req: any, file, cb) => {
        const userId = String(req.user?.id || req.params?.id || 'user').replace(/[^a-zA-Z0-9_-]/g, '');
        const rawExt = path.extname(file.originalname || '').toLowerCase();
        const mimeExt = ALLOWED_IMAGE_MIME_TO_EXT[(file.mimetype || '').toLowerCase()] || '.png';
        const ext = ALLOWED_IMAGE_EXTS.has(rawExt) ? rawExt : mimeExt;
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
        cb(null, `avatar-${userId}-${uniqueSuffix}${ext}`);
      },
    }),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
    fileFilter: (_req, file, cb) => {
      if (!ALLOWED_IMAGE_MIME_TO_EXT[(file.mimetype || '').toLowerCase()]) {
        return cb(
          new BadRequestException('Formato inválido. Envie apenas imagens PNG, JPG, JPEG, WebP ou GIF.'),
          false,
        );
      }
      cb(null, true);
    },
  };
}

/**
 * Remove com segurança o avatar local anterior quando substituído ou excluído.
 */
export async function removeLocalAvatarIfExists(avatarUrl?: string | null): Promise<void> {
  if (!avatarUrl || !avatarUrl.startsWith(AVATAR_PUBLIC_PREFIX)) {
    return;
  }

  const fileName = path.basename(avatarUrl);
  if (!fileName || fileName === '.gitkeep') {
    return;
  }

  const filePath = path.join(getAvatarUploadDir(), fileName);
  try {
    await fs.promises.unlink(filePath);
  } catch (error: any) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
  }
}


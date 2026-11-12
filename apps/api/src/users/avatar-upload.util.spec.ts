import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  AVATAR_PUBLIC_PREFIX,
  buildAvatarPublicUrl,
  ensureAvatarUploadDir,
  getAvatarUploadDir,
  removeLocalAvatarIfExists,
} from './avatar-upload.util';

describe('avatar-upload.util', () => {
  let tempRoot: string;
  let cwdSpy: jest.SpyInstance;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sinpep-avatar-test-'));
    cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue(tempRoot);
  });

  afterEach(() => {
    cwdSpy.mockRestore();
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it('cria diretório local uploads/avatars e gera URL pública esperada', () => {
    const dir = ensureAvatarUploadDir();
    expect(dir).toBe(path.join(tempRoot, 'uploads', 'avatars'));
    expect(fs.existsSync(dir)).toBe(true);
    expect(getAvatarUploadDir()).toBe(dir);

    expect(buildAvatarPublicUrl('avatar-u1-123.png')).toBe(`${AVATAR_PUBLIC_PREFIX}avatar-u1-123.png`);
  });

  it('remove avatar local anterior quando pertence a /uploads/avatars/ e ignora path traversal/externos', async () => {
    const dir = ensureAvatarUploadDir();
    const avatarPath = path.join(dir, 'avatar-old.png');
    const outsideFile = path.join(tempRoot, 'keep-me.txt');
    fs.writeFileSync(avatarPath, 'png-bytes');
    fs.writeFileSync(outsideFile, 'safe');

    await removeLocalAvatarIfExists('/uploads/avatars/avatar-old.png');
    expect(fs.existsSync(avatarPath)).toBe(false);

    // URL externa não afeta sistema de arquivos
    await removeLocalAvatarIfExists('https://example.com/avatar.png');
    // Arquivo inexistente não gera erro
    await expect(removeLocalAvatarIfExists('/uploads/avatars/does-not-exist.png')).resolves.toBeUndefined();
    // Path traversal protegido por prefixo + basename
    await removeLocalAvatarIfExists('/uploads/avatars/../../keep-me.txt');
    expect(fs.existsSync(outsideFile)).toBe(true);
  });
});


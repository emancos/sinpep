import { resolveStorageFileUrl } from './storageUrl';

/**
 * Resolve URLs de avatar suportando caminhos locais (/uploads/avatars/...), URLs externas e previews data:/blob:.
 */
export function getAvatarUrl(avatarSrc: string | null | undefined): string | null {
  return resolveStorageFileUrl(avatarSrc);
}

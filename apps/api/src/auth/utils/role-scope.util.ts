export interface ScopedUserLike {
  id?: string;
  email?: string;
  name?: string;
  phone?: string | null;
  healthCenterId?: string | null;
  activeHealthCenterId?: string | null;
  profileName?: string | null;
  activeProfileName?: string | null;
  activeProfile?: { name?: string | null } | null;
  profile?: { name?: string | null } | null;
  permissions?: string[];
  linkedHealthCenterIds?: string[];
  userHealthCenters?: Array<{ healthCenterId?: string | null; healthCenter?: { id?: string | null } | null }>;
}

/**
 * Extrai exclusivamente as unidades às quais o usuário possui vínculo direto
 * (`users.health_center_id` e `user_health_centers`), sem incluir unidades liberadas
 * apenas por perfil administrativo paralelo.
 */
export function extractLinkedHealthCenterIds(user: ScopedUserLike | null | undefined): string[] {
  if (!user) return [];

  if (Array.isArray(user.linkedHealthCenterIds) && user.linkedHealthCenterIds.length > 0) {
    return Array.from(new Set(user.linkedHealthCenterIds.filter((id): id is string => Boolean(id))));
  }

  const ids = new Set<string>();
  if (user.healthCenterId) {
    ids.add(user.healthCenterId);
  }
  if (Array.isArray(user.userHealthCenters)) {
    for (const uhc of user.userHealthCenters) {
      const id = uhc?.healthCenterId || uhc?.healthCenter?.id;
      if (id) ids.add(id);
    }
  }
  return Array.from(ids);
}

/**
 * Indica se o usuário está operando sob o perfil ativo "Solicitante (UBS)"
 * sem privilégios administrativos no perfil atualmente selecionado.
 */
export function isSolicitorRestrictedUser(user: ScopedUserLike | null | undefined): boolean {
  if (!user) return false;
  const permissions = Array.isArray(user.permissions) ? user.permissions : [];
  if (permissions.includes('admin:access')) {
    return false;
  }

  const profileName = (
    user.activeProfileName ||
    user.activeProfile?.name ||
    user.profileName ||
    user.profile?.name ||
    ''
  ).toLowerCase();

  return profileName.includes('solicitante');
}


import type { ActiveProfile, User } from '../store/useAuthStore';

export function isSolicitorRestrictedUser(
  user?: User | null,
  activeProfile?: ActiveProfile | null,
  permissions: string[] = [],
): boolean {
  if (permissions.includes('admin:access')) {
    return false;
  }

  const profileName = (activeProfile?.name || user?.profileName || '').toLowerCase();
  return profileName.includes('solicitante');
}

export function getUserLinkedHealthCenterIds(user?: User | null): string[] {
  if (!user) return [];
  if (Array.isArray(user.linkedHealthCenterIds) && user.linkedHealthCenterIds.length > 0) {
    return Array.from(new Set(user.linkedHealthCenterIds.filter(Boolean)));
  }
  return user.healthCenterId ? [user.healthCenterId] : [];
}

export function canTogglePatientActive(
  user?: User | null,
  activeProfile?: ActiveProfile | null,
  permissions: string[] = [],
): boolean {
  const hasWriteAccess = permissions.includes('patients:write') || permissions.includes('admin:access');
  if (!hasWriteAccess) return false;
  return !isSolicitorRestrictedUser(user, activeProfile, permissions);
}

export function canEditPatient(
  user?: User | null,
  activeProfile?: ActiveProfile | null,
  permissions: string[] = [],
  patientHealthCenterId?: string | null,
): boolean {
  const hasWriteAccess = permissions.includes('patients:write') || permissions.includes('admin:access');
  if (!hasWriteAccess) return false;

  if (!isSolicitorRestrictedUser(user, activeProfile, permissions)) {
    return true;
  }

  if (!patientHealthCenterId) return false;
  return getUserLinkedHealthCenterIds(user).includes(patientHealthCenterId);
}

export interface FullPatientUpdatePayload {
  name: string;
  cpf: string;
  cns?: string;
  birthDate: string;
  gender: string;
  healthCenterId: string;
  healthAgentId?: string | null;
  address?: string;
  phones?: { phoneNumber: string; isWhatsapp: boolean }[];
}

export function buildPatientUpdatePayload(
  isSolicitorRestricted: boolean,
  fullPayload: FullPatientUpdatePayload,
): Partial<FullPatientUpdatePayload> {
  if (isSolicitorRestricted) {
    return {
      healthCenterId: fullPayload.healthCenterId,
      healthAgentId: fullPayload.healthAgentId || null,
      address: fullPayload.address,
      phones: fullPayload.phones,
    };
  }

  return fullPayload;
}


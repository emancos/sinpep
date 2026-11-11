import { describe, expect, it } from 'vitest';
import type { ActiveProfile, User } from '../../store/useAuthStore';
import {
  buildPatientUpdatePayload,
  canEditPatient,
  canTogglePatientActive,
  getUserLinkedHealthCenterIds,
  isSolicitorRestrictedUser,
} from '../patientPermissions';

const solicitorProfile: ActiveProfile = {
  id: 'prof-sol',
  name: 'Solicitante (UBS)',
};

const adminProfile: ActiveProfile = {
  id: 'prof-admin',
  name: 'Administrador',
};

const dualUnitSolicitor: User = {
  id: 'user-sol-1',
  name: 'Enfermeira UBS',
  email: 'maria@ubs.gov.br',
  profileId: 'prof-sol',
  profileName: 'Solicitante (UBS)',
  healthCenterId: 'hc-1',
  linkedHealthCenterIds: ['hc-1', 'hc-2'],
  isMunicipalRegulator: false,
};

describe('patientPermissions utils', () => {
  it('identifica Solicitante (UBS) sem admin:access como restrito e Administrador como irrestrito', () => {
    expect(
      isSolicitorRestrictedUser(dualUnitSolicitor, solicitorProfile, ['patients:read', 'patients:write']),
    ).toBe(true);

    expect(
      isSolicitorRestrictedUser(dualUnitSolicitor, solicitorProfile, ['admin:access', 'patients:write']),
    ).toBe(false);

    expect(
      isSolicitorRestrictedUser(dualUnitSolicitor, adminProfile, ['patients:write']),
    ).toBe(false);
  });

  it('retorna todas as unidades vinculadas diretamente ao usuário sem incluir unidades externas', () => {
    expect(getUserLinkedHealthCenterIds(dualUnitSolicitor)).toEqual(['hc-1', 'hc-2']);
    expect(
      getUserLinkedHealthCenterIds({
        ...dualUnitSolicitor,
        linkedHealthCenterIds: undefined,
        healthCenterId: 'hc-only',
      }),
    ).toEqual(['hc-only']);
  });

  it('bloqueia toggleActive para Solicitante (UBS) e permite para outros perfis com escrita', () => {
    expect(
      canTogglePatientActive(dualUnitSolicitor, solicitorProfile, ['patients:read', 'patients:write']),
    ).toBe(false);

    expect(
      canTogglePatientActive(dualUnitSolicitor, adminProfile, ['admin:access', 'patients:write']),
    ).toBe(true);

    expect(
      canTogglePatientActive(dualUnitSolicitor, adminProfile, ['patients:read']),
    ).toBe(false);
  });

  it('permite edição de paciente somente quando pertencente às unidades vinculadas do Solicitante', () => {
    const perms = ['patients:read', 'patients:write'];
    expect(canEditPatient(dualUnitSolicitor, solicitorProfile, perms, 'hc-1')).toBe(true);
    expect(canEditPatient(dualUnitSolicitor, solicitorProfile, perms, 'hc-2')).toBe(true);
    expect(canEditPatient(dualUnitSolicitor, solicitorProfile, perms, 'hc-other')).toBe(false);
    expect(canEditPatient(dualUnitSolicitor, solicitorProfile, perms, null)).toBe(false);

    // Administrador ou perfil não solicitante edita qualquer unidade do município
    expect(canEditPatient(dualUnitSolicitor, adminProfile, ['admin:access', 'patients:write'], 'hc-other')).toBe(true);
  });

  it('buildPatientUpdatePayload envia apenas Vínculo, Agente, Endereço e Telefones para Solicitante restrito', () => {
    const full = {
      name: 'Paciente Teste',
      cpf: '111.222.333-44',
      cns: '700000000000001',
      birthDate: '1990-01-01',
      gender: 'FEMININO',
      healthCenterId: 'hc-municipal-destino',
      healthAgentId: '',
      address: 'Rua Nova, 123',
      phones: [{ phoneNumber: '(83) 99999-1111', isWhatsapp: true }],
    };

    const restrictedPayload = buildPatientUpdatePayload(true, full);
    expect(restrictedPayload).toEqual({
      healthCenterId: 'hc-municipal-destino',
      healthAgentId: null,
      address: 'Rua Nova, 123',
      phones: [{ phoneNumber: '(83) 99999-1111', isWhatsapp: true }],
    });
    expect(restrictedPayload).not.toHaveProperty('name');
    expect(restrictedPayload).not.toHaveProperty('cpf');
    expect(restrictedPayload).not.toHaveProperty('cns');

    expect(buildPatientUpdatePayload(false, full)).toEqual(full);
  });
});


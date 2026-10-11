import type { Doctor } from '../hooks/useDoctors';

export const normalizeProcedureText = (str?: string | null): string => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
};

/**
 * Retorna os nomes de todos os procedimentos explicitamente autorizados para o médico
 * (diretos ou via grupos de procedimentos).
 */
export function getDoctorAuthorizedProcedureNames(doctor: Doctor | null | undefined): string[] {
  if (!doctor) return [];
  const names = new Set<string>();

  // 1. Procedimentos diretos
  (doctor.doctorProcedures || []).forEach((dp) => {
    if (dp.procedure?.name) {
      names.add(dp.procedure.name.trim());
    }
  });

  // 2. Grupos de procedimentos
  (doctor.doctorProcedureGroups || []).forEach((dpg) => {
    (dpg.procedureGroup?.procedures || []).forEach((p) => {
      if (p.name) {
        names.add(p.name.trim());
      }
    });
  });

  return Array.from(names);
}

/**
 * Retorna o total de procedimentos autorizados configurados para o médico.
 * Se não tiver procedimentos configurados mas tiver especialidades, retorna o total de especialidades como fallback.
 */
export function getDoctorAuthorizedProceduresCount(doctor: Doctor | null | undefined): number {
  if (!doctor) return 0;
  const procNames = getDoctorAuthorizedProcedureNames(doctor);
  if (procNames.length > 0) {
    return procNames.length;
  }
  return (doctor.doctorSpecialties || []).length;
}

/**
 * Verifica se um procedimento (ou chave de especialidade do agendamento e-SUS)
 * é autorizado para o médico.
 */
export function isProcedureAuthorizedForDoctor(
  procOrSpecKey: string,
  doctor: Doctor | null | undefined
): boolean {
  if (!doctor || !procOrSpecKey) return false;
  const target = normalizeProcedureText(procOrSpecKey);
  if (!target) return false;

  // 1. Procedimentos diretos
  const directProcs = doctor.doctorProcedures || [];
  for (const dp of directProcs) {
    if (!dp.procedure?.name) continue;
    const pName = normalizeProcedureText(dp.procedure.name);
    if (target === pName || target.includes(pName) || pName.includes(target)) {
      return true;
    }
  }

  // 2. Grupos de procedimentos
  const groupProcs = doctor.doctorProcedureGroups || [];
  for (const dpg of groupProcs) {
    for (const p of dpg.procedureGroup?.procedures || []) {
      if (!p.name) continue;
      const pName = normalizeProcedureText(p.name);
      if (target === pName || target.includes(pName) || pName.includes(target)) {
        return true;
      }
    }
  }

  // 3. Especialidades médicas cadastradas como fallback
  const specs = doctor.doctorSpecialties || [];
  for (const ds of specs) {
    if (!ds.specialty?.name) continue;
    const sName = normalizeProcedureText(ds.specialty.name)
      .replace(/^MEDICO\s+/i, '')
      .replace(/^MEDICA\s+/i, '')
      .trim();
    if (!sName) continue;
    if (target.includes(sName) || sName.includes(target)) {
      return true;
    }
    // Raiz com pelo menos 4 caracteres (ex: UROLO, CARDIO, REUMA, OFTAL, DERMA)
    const root = sName.slice(0, Math.min(sName.length, 5));
    if (root.length >= 4 && target.includes(root)) {
      return true;
    }
  }

  return false;
}

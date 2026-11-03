/**
 * Utilitários de formatação para o padrão brasileiro de dados (SUS / SINPeP)
 */

export const formatCPF = (cpf?: string | null): string => {
  if (!cpf) return 'Não informado';
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return cpf;
  return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`;
};

export const formatCNS = (cns?: string | null): string => {
  if (!cns) return 'Não informado';
  const clean = cns.replace(/\D/g, '').slice(0, 15);
  if (clean.length !== 15) return cns;
  return `${clean.slice(0, 3)} ${clean.slice(3, 7)} ${clean.slice(7, 11)} ${clean.slice(11, 15)}`;
};

export const formatBirthDate = (birthDate?: string | null): string => {
  if (!birthDate) return 'Não informado';
  try {
    const d = new Date(birthDate.includes('T') ? birthDate : `${birthDate}T00:00:00`);
    if (isNaN(d.getTime())) return birthDate;
    return d.toLocaleDateString('pt-BR');
  } catch {
    return birthDate;
  }
};

export const formatGender = (gender?: string | null): string => {
  if (!gender) return 'Não informado';
  const g = gender.toUpperCase().trim();
  if (g === 'M' || g === 'MASCULINO') return 'Masculino';
  if (g === 'F' || g === 'FEMININO') return 'Feminino';
  return gender;
};

export const formatBirthDateAndGender = (
  birthDate?: string | null,
  gender?: string | null,
): string => {
  const b = formatBirthDate(birthDate);
  const g = formatGender(gender);

  if (b === 'Não informado' && g === 'Não informado') return 'Não informado';
  if (b !== 'Não informado' && g !== 'Não informado') return `${b} (${g})`;
  if (b !== 'Não informado') return b;
  return g;
};

export const calculateAge = (birthDate?: string | null): string => {
  if (!birthDate) return '';
  try {
    const d = new Date(birthDate.includes('T') ? birthDate : `${birthDate}T00:00:00`);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) {
      age--;
    }
    return `${age} anos`;
  } catch {
    return '';
  }
};

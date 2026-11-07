/**
 * Utilitários de formatação para o padrão brasileiro de dados (SUS / SINPeP)
 */

/**
 * Formata qualquer data para o padrão estrito dd/mm/yyyy.
 * Seguro contra desvios de fuso horário em strings ISO YYYY-MM-DD.
 */
export const formatDateBR = (date?: string | Date | null): string => {
  if (!date) return '—';
  if (typeof date === 'string') {
    const trimmed = date.trim();
    if (!trimmed) return '—';
    // Se já estiver no formato DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return trimmed;
    // Se for formato ISO simples YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [year, month, day] = trimmed.split('-');
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }
    // Se for formato ISO com hora ou datetime
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
    return trimmed;
  }
  if (date instanceof Date && !isNaN(date.getTime())) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
  return '—';
};

/**
 * Formata data e hora para o padrão estrito dd/mm/yyyy às HH:mm (ou dd/mm/yyyy HH:mm).
 */
export const formatDateTimeBR = (date?: string | Date | null, withAt: boolean = true): string => {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (!(d instanceof Date) || isNaN(d.getTime())) return typeof date === 'string' ? date : '—';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const datePart = `${day}/${month}/${year}`;
    const timePart = `${hours}:${minutes}`;
    return withAt ? `${datePart} às ${timePart}` : `${datePart} ${timePart}`;
  } catch {
    return typeof date === 'string' ? date : '—';
  }
};

export const formatCPF = (cpf?: string | null): string => {
  if (!cpf) return 'Não informado';
  if (typeof cpf === 'string' && (cpf.toUpperCase().startsWith('SUS') || cpf.toUpperCase().startsWith('TEMP'))) {
    return 'Não informado';
  }
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return 'Não informado';
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
  const formatted = formatDateBR(birthDate);
  return formatted === '—' ? 'Não informado' : formatted;
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

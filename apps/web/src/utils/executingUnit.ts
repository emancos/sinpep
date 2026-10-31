export interface ExecutingUnit {
  name: string;
  cnes: string;
}

export const DEFAULT_EXECUTING_UNIT: ExecutingUnit = {
  name: 'POLICLINICA ROBERVAL MEDEIROS DE ARAUJO',
  cnes: '2606712',
};

const STORAGE_KEY = 'sinpep_executing_unit';

export const getStoredExecutingUnit = (): ExecutingUnit => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.name || parsed.cnes)) {
        return {
          name: parsed.name || DEFAULT_EXECUTING_UNIT.name,
          cnes: parsed.cnes || DEFAULT_EXECUTING_UNIT.cnes,
        };
      }
    }
  } catch {
    // Ignore parse error
  }
  return DEFAULT_EXECUTING_UNIT;
};

export const setStoredExecutingUnit = (unit: Partial<ExecutingUnit> | null | undefined) => {
  try {
    if (unit && (unit.name || unit.cnes)) {
      const current = getStoredExecutingUnit();
      const updated: ExecutingUnit = {
        name: unit.name || current.name,
        cnes: unit.cnes || current.cnes,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  } catch {
    // Ignore storage errors
  }
};

/**
 * Resolve a unidade executante avaliando múltiplos objetos na ordem de prioridade.
 * Reconhece campos do e-SUS ('noEstabelecimentoExecutante', 'coCnesEstabelecimentoExecutante'),
 * campos persistidos no prontuário ('executingUnitName', 'executingUnitCnes'),
 * ou objeto direto ('name', 'cnes').
 */
export const resolveExecutingUnit = (sources?: Array<any | null | undefined>): ExecutingUnit => {
  if (sources) {
    for (const s of sources) {
      if (!s) continue;
      const name = s.noEstabelecimentoExecutante || s.executingUnitName || s.executingUnit?.name || s.name;
      const cnes = s.coCnesEstabelecimentoExecutante || s.executingUnitCnes || s.executingUnit?.cnes || s.cnes;
      if (name || cnes) {
        return {
          name: name || '',
          cnes: cnes || '',
        };
      }
    }
  }
  return getStoredExecutingUnit();
};

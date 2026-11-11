import { DashboardService } from './dashboard.service';

function extractSqlText(node: unknown): string {
  if (typeof node === 'string') return node;
  if (!node || typeof node !== 'object') return '';
  const obj = node as Record<string, any>;
  if (Array.isArray(obj.value)) {
    return obj.value.join('');
  }
  if (Array.isArray(obj.queryChunks)) {
    return obj.queryChunks.map(extractSqlText).join(' ');
  }
  return '';
}

describe('DashboardService (getRegulatorSummary)', () => {
  const createMockDb = () => {
    const executedSqlStrings: string[] = [];

    const mockDb = {
      execute: jest.fn(async (queryObj: unknown) => {
        const sqlText = extractSqlText(queryObj);
        executedSqlStrings.push(sqlText);

        if (sqlText.includes('GROUP BY status, priority')) {
          return {
            rows: [
              { status: 'PENDENTE_REGULACAO', priority: 'URGENTE', count: 4 },
              { status: 'PENDENTE_REGULACAO', priority: 'PRIORITARIO', count: 1 },
              { status: 'PENDENTE_AGENDAMENTO', priority: 'ELETIVO', count: 3 },
              { status: 'AGENDADA', priority: 'ELETIVO', count: 2 },
              { status: 'DEVOLVIDA', priority: 'ELETIVO', count: 1 },
              { status: 'NEGADA', priority: 'PRIORITARIO', count: 1 },
            ],
          };
        }
        if (
          sqlText.includes('WITH waiting_agg AS') &&
          sqlText.includes("WHERE status = 'PENDENTE_AGENDAMENTO'")
        ) {
          return {
            rows: [{ specialty_name: 'GRUPO - TOMOGRAFIA - GERAL', count: 3 }],
          };
        }
        if (
          sqlText.includes('WITH top_pending AS') &&
          sqlText.includes("WHERE status = 'PENDENTE_REGULACAO'")
        ) {
          return {
            rows: [
              {
                id: 'req-urg-1',
                protocol: 'SOL-202611-1001',
                risk: 'URGENTE',
                status: 'PENDENTE_REGULACAO',
                created_at: '2026-11-11T10:00:00.000Z',
                patient_name: 'Ana Paula',
                patient_cpf: '12345678900',
                specialty_name: 'GRUPO - TOMOGRAFIA - GERAL',
                requesting_unit: 'UBS Centro',
              },
            ],
          };
        }
        return { rows: [] };
      }),
    };

    return { mockDb, executedSqlStrings };
  };

  it('executa 3 consultas em paralelo usando priority::text (sem risk_classification) e retorna KPIs e breakdown ordenados', async () => {
    const { mockDb, executedSqlStrings } = createMockDb();
    const service = new DashboardService(mockDb as any);

    const result: any = await service.getSummary({
      id: 'reg-1',
      activeProfileName: 'Regulador (Central de Regulação)',
      permissions: ['regulation-operator:read'],
    });

    expect(executedSqlStrings.length).toBe(3);
    for (const sqlText of executedSqlStrings) {
      expect(sqlText).not.toContain('risk_classification');
    }

    const joinedSql = executedSqlStrings.join('\n');
    expect(joinedSql).toContain('priority::text');
    expect(joinedSql).toContain('URGENTE');
    expect(joinedSql).toContain('URGENCIA');
    expect(joinedSql).toContain('LEFT JOIN specialties');
    expect(joinedSql).toContain('LEFT JOIN procedure_groups');
    expect(joinedSql).toContain('LEFT JOIN procedures');

    expect(result.kpis).toEqual({
      toEvaluate: 5,
      waitingList: 3,
      scheduled: 2,
      returned: 1,
      denied: 1,
      totalActive: 8,
    });
    expect(result.charts.riskBreakdown).toEqual([
      { risk: 'URGENTE', count: 4 },
      { risk: 'PRIORITARIO', count: 1 },
      { risk: 'ELETIVO', count: 3 },
    ]);
    expect(result.charts.topWaitingSpecialties).toEqual([
      { specialty_name: 'GRUPO - TOMOGRAFIA - GERAL', count: 3 },
    ]);
    expect(result.recentItems).toHaveLength(1);
    expect(result.recentItems[0].risk).toBe('URGENTE');
  });

  it('roteia perfil Regulador mesmo com admin:access, deduplica chamadas concorrentes e reutiliza cache de 10s', async () => {
    const { mockDb, executedSqlStrings } = createMockDb();
    const service = new DashboardService(mockDb as any);

    const [first, second]: any[] = await Promise.all([
      service.getSummary({
        id: 'reg-1',
        activeProfileName: 'Regulador (Central de Regulação)',
        permissions: ['admin:access', 'regulation-operator:read'],
      }),
      service.getSummary({
        id: 'reg-2',
        activeProfileName: 'Regulador (Central de Regulação)',
        permissions: ['admin:access'],
      }),
    ]);

    expect(mockDb.execute).toHaveBeenCalledTimes(3);
    expect(executedSqlStrings.some((s) => s.includes('GROUP BY status, priority'))).toBe(true);
    expect(first.kpis.toEvaluate).toBe(5);
    expect(second).toEqual(first);

    const third: any = await service.getSummary({
      id: 'reg-3',
      activeProfileName: 'Regulador (Central de Regulação)',
      permissions: ['regulation-operator:read'],
    });

    expect(mockDb.execute).toHaveBeenCalledTimes(3);
    expect(third).toEqual(first);
  });
});

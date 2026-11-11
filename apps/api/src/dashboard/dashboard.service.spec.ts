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
  it('consulta priority em vez de risk_classification e retorna breakdown, especialidades/grupos e urgências', async () => {
    const executedSqlStrings: string[] = [];

    const mockDb = {
      execute: jest.fn(async (queryObj: unknown) => {
        const sqlText = extractSqlText(queryObj);
        executedSqlStrings.push(sqlText);

        if (sqlText.includes('FILTER (WHERE status =')) {
          return {
            rows: [
              {
                to_evaluate: 4,
                to_schedule: 2,
                scheduled: 3,
                returned: 1,
                denied: 0,
              },
            ],
          };
        }
        if (sqlText.includes('GROUP BY priority')) {
          return {
            rows: [
              { risk: 'URGENCIA', count: 2 },
              { risk: 'PRIORITARIO', count: 1 },
              { risk: 'ELETIVO', count: 3 },
            ],
          };
        }
        if (sqlText.includes("WHERE r.status = 'PENDENTE_AGENDAMENTO'")) {
          return {
            rows: [{ specialty_name: 'GRUPO - TOMOGRAFIA - GERAL', count: 2 }],
          };
        }
        if (sqlText.includes("WHERE r.status = 'PENDENTE_REGULACAO'")) {
          return {
            rows: [
              {
                id: 'req-urg-1',
                protocol: 'SOL-202611-1001',
                risk: 'URGENCIA',
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

    const service = new DashboardService(mockDb as any);
    const result: any = await service.getSummary({
      id: 'reg-1',
      activeProfileName: 'Regulador (Central de Regulação)',
      permissions: ['regulation-operator:read'],
    });

    expect(executedSqlStrings.length).toBe(4);
    for (const sqlText of executedSqlStrings) {
      expect(sqlText).not.toContain('risk_classification');
    }

    const joinedSql = executedSqlStrings.join('\n');
    expect(joinedSql).toContain('priority');
    expect(joinedSql).toContain('LEFT JOIN specialties');
    expect(joinedSql).toContain('LEFT JOIN procedure_groups');
    expect(joinedSql).toContain('LEFT JOIN procedures');

    expect(result.kpis).toEqual({
      toEvaluate: 4,
      waitingList: 2,
      scheduled: 3,
      returned: 1,
      denied: 0,
      totalActive: 6,
    });
    expect(result.charts.riskBreakdown).toEqual([
      { risk: 'URGENCIA', count: 2 },
      { risk: 'PRIORITARIO', count: 1 },
      { risk: 'ELETIVO', count: 3 },
    ]);
    expect(result.charts.topWaitingSpecialties).toEqual([
      { specialty_name: 'GRUPO - TOMOGRAFIA - GERAL', count: 2 },
    ]);
    expect(result.recentItems).toHaveLength(1);
    expect(result.recentItems[0].risk).toBe('URGENCIA');
  });
});

import { Injectable } from '@nestjs/common';

@Injectable()
export class ReportsExportService {
  /**
   * Converte uma matriz de cabeçalhos e linhas em string CSV formatada para o Excel brasileiro
   * (delimitador ';' e prefixo UTF-8 BOM '\uFEFF' para evitar quebra de acentos)
   */
  private toCsv(headers: string[], rows: Array<Array<string | number | undefined | null>>): string {
    const escape = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const headerLine = headers.map(escape).join(';');
    const bodyLines = rows.map((row) => row.map(escape).join(';'));
    return '\uFEFF' + [headerLine, ...bodyLines].join('\r\n');
  }

  exportRegulationCsv(data: any): string {
    const headers = ['Categoria / Agrupamento', 'Indicador', 'Valor', 'Percentual', 'Origem e-SUS', 'Origem SINPeP'];
    const rows: Array<Array<any>> = [];

    // Totais de Status
    const counts = data.statusCounts || {};
    rows.push(['Status', 'Pendente Triagem', counts.to_evaluate || 0, '', '', '']);
    rows.push(['Status', 'Fila de Espera', counts.waiting_list || 0, '', '', '']);
    rows.push(['Status', 'Agendadas', counts.scheduled || 0, '', '', '']);
    rows.push(['Status', 'Devolvidas', counts.returned || 0, '', '', '']);
    rows.push(['Status', 'Total Geral', counts.total || 0, '100%', counts.esus_total || 0, counts.sinpep_total || 0]);

    // Riscos
    (data.riskBreakdown || []).forEach((r: any) => {
      const pct = counts.total > 0 ? ((r.count / counts.total) * 100).toFixed(1) + '%' : '0%';
      rows.push(['Prioridade', r.risk || 'N/A', r.count, pct, '', '']);
    });

    // Especialidades
    (data.bySpecialty || []).forEach((s: any) => {
      rows.push(['Especialidade', s.specialty_name, s.total_requests, '', s.esus_count || 0, s.sinpep_count || 0]);
    });

    // Unidades Solicitantes
    (data.bySolicitingUnit || []).forEach((u: any) => {
      const retRate = u.total_requests > 0 ? Math.round((u.returned / u.total_requests) * 100) + '%' : '0%';
      rows.push(['UBS Solicitante', u.ubs_name, u.total_requests, `Devolvidas: ${retRate}`, u.esus_count || 0, u.sinpep_count || 0]);
    });

    return this.toCsv(headers, rows);
  }

  exportReceptionAttendanceCsv(data: any): string {
    const headers = [
      'Ordem da Fila',
      'Horário',
      'Data',
      'Nome do Paciente',
      'CPF',
      'CNS',
      'Especialidade',
      'Classificação de Risco',
      'Situação do Atendimento',
      'Origem do Registro',
    ];

    const rows = (data.attendanceList || []).map((item: any, idx: number) => [
      item.queue_order || idx + 1,
      item.time || '',
      item.date || data.date || '',
      item.patient_name || '',
      item.patient_cpf || '',
      item.patient_cns || '',
      item.specialty_name || '',
      item.priority || '',
      item.status || '',
      item.origin || '',
    ]);

    return this.toCsv(headers, rows);
  }

  exportEpidemiologicalCsv(data: any): string {
    const headers = ['Tipo', 'Código / Classificação', 'Descrição Oficial', 'Total Ocorrências', 'Origem e-SUS', 'Origem SINPeP'];
    const rows: Array<Array<any>> = [];

    const com = data.comorbidities || {};
    rows.push(['Comorbidade', 'Hipertensão Arterial', 'Pacientes Hipertensos Cadastrados', com.hypertensive || 0, '', '']);
    rows.push(['Comorbidade', 'Diabetes Mellitus', 'Pacientes Diabéticos Cadastrados', com.diabetic || 0, '', '']);
    rows.push(['Comorbidade', 'Tabagismo', 'Pacientes Fumantes', com.smoker || 0, '', '']);
    rows.push(['Comorbidade', 'Oncologia', 'Pacientes Oncológicos', com.oncological || 0, '', '']);
    rows.push(['Comorbidade', 'PcD', 'Pessoa com Deficiência', com.pcd || 0, '', '']);

    (data.topCid || []).forEach((c: any) => {
      rows.push(['CID-10', c.code, c.description || '', c.count || 0, c.from_esus || 0, c.from_sinpep || 0]);
    });

    return this.toCsv(headers, rows);
  }

  exportSolicitorCsv(data: any): string {
    const headers = ['Categoria', 'Identificação', 'Total', 'Detalhamento'];
    const rows: Array<Array<any>> = [];

    const counts = data.statusCounts || {};
    rows.push(['Status', 'Pendente Triagem', counts.to_evaluate || 0, '']);
    rows.push(['Status', 'Fila de Espera', counts.waiting_list || 0, '']);
    rows.push(['Status', 'Agendadas', counts.scheduled || 0, '']);
    rows.push(['Status', 'Devolvidas', counts.returned || 0, '']);

    (data.bySpecialty || []).forEach((s: any) => {
      rows.push(['Especialidade', s.specialty_name, s.count || 0, '']);
    });

    (data.returnReasons || []).forEach((r: any) => {
      rows.push(['Motivo de Devolução', r.reason, r.count || 0, 'Inconsistência identificada']);
    });

    return this.toCsv(headers, rows);
  }

  exportUnitOperationalCsv(data: any): string {
    const headers = ['Profissional', 'CRM/UF', 'Especialidade', 'Vagas Agendadas', 'Atendimentos Concluídos'];
    const rows = (data.productionByDoctor || []).map((d: any) => [
      d.name || '',
      `${d.crm || ''}/${d.crm_state || ''}`,
      d.specialty_name || '',
      d.booked_slots || 0,
      d.completed_records || 0,
    ]);

    return this.toCsv(headers, rows);
  }

  exportDoctorProductionCsv(data: any): string {
    const headers = ['Mês / CID', 'Indicador', 'Quantidade'];
    const rows: Array<Array<any>> = [];

    (data.monthlyEvolution || []).forEach((m: any) => {
      rows.push([m.month, 'Atendimentos Realizados', m.count]);
    });

    (data.topCid10 || []).forEach((c: any) => {
      rows.push([c.cid10, 'Ocorrências Diagnosticadas', c.count]);
    });

    return this.toCsv(headers, rows);
  }
}


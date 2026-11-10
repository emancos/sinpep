import { Injectable, Inject } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { eq, and } from 'drizzle-orm';

interface ReportHeaderOptions {
  title: string;
  subtitle?: string;
  filters?: Record<string, string | undefined>;
  user?: { name?: string; activeProfileName?: string };
  unitName?: string;
  cnes?: string;
}

interface BrandingInfo {
  municipalityName: string;
  department: string;
  systemTitle: string;
  systemSubtitle: string;
}

@Injectable()
export class ReportsPdfService {
  constructor(
    @Inject('DATABASE_CONNECTION')
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  private async getBranding(): Promise<BrandingInfo> {
    try {
      const defaultBranding = await this.db.query.municipalityBrandings.findFirst({
        where: and(
          eq(schema.municipalityBrandings.isDefault, true),
          eq(schema.municipalityBrandings.isActive, true),
        ),
      });

      if (defaultBranding) {
        return {
          municipalityName: defaultBranding.fullName || defaultBranding.name || 'Prefeitura Municipal',
          department: defaultBranding.department || 'Secretaria Municipal de Saúde',
          systemTitle: defaultBranding.systemTitle || 'SINPeP',
          systemSubtitle: defaultBranding.systemSubtitle || 'Sistema Integrado de Regulação e Prontuário Eletrônico do Paciente',
        };
      }
    } catch {
      // fallback
    }

    return {
      municipalityName: 'Prefeitura Municipal',
      department: 'Secretaria Municipal de Saúde',
      systemTitle: 'SINPeP',
      systemSubtitle: 'Sistema Integrado de Regulação e Prontuário Eletrônico do Paciente',
    };
  }

  /**
   * Inicializa o documento PDF com configurações de página e margens
   */
  private createDoc(landscape: boolean = false): typeof PDFDocument {
    return new PDFDocument({
      size: 'A4',
      layout: landscape ? 'landscape' : 'portrait',
      margins: { top: 30, bottom: 45, left: 30, right: 30 },
      bufferPages: true,
    });
  }

  /**
   * Finaliza o documento, adiciona numeração de páginas em todas as páginas e retorna o buffer
   */
  private finalizeDoc(doc: typeof PDFDocument, user?: { name?: string; activeProfileName?: string }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const range = doc.bufferedPageRange();
      const now = new Date();
      const dateStr = now.toLocaleDateString('pt-BR');
      const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const userName = user?.name || 'Sistema';
      const userProfile = user?.activeProfileName ? ` (${user.activeProfileName})` : '';

      const pageCount = range.count;
      for (let i = range.start; i < range.start + pageCount; i++) {
        doc.switchToPage(i);
        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        const marginX = 30;
        const contentWidth = pageWidth - 2 * marginX;
        const footerY = pageHeight - 32;

        // Desativa a margem inferior para evitar que o PDFKit dispare quebra automática de página ao desenhar o rodapé
        const oldBottom = doc.page.margins.bottom;
        doc.page.margins.bottom = 0;

        // Linha divisória do rodapé
        doc.strokeColor('#cbd5e1').lineWidth(0.5)
          .moveTo(marginX, footerY - 4)
          .lineTo(marginX + contentWidth, footerY - 4)
          .stroke();

        // Texto do rodapé de auditoria
        doc.font('Helvetica').fontSize(6.5).fillColor('#64748b');
        doc.text(
          `Documento emitido eletronicamente pelo SINPeP em ${dateStr} às ${timeStr} por ${userName}${userProfile}`,
          marginX,
          footerY,
          { width: contentWidth - 80, align: 'left', lineBreak: false }
        );

        // Paginação "Página X de Y"
        doc.font('Helvetica-Bold').fontSize(7).fillColor('#475569');
        doc.text(
          `Página ${i + 1} de ${pageCount}`,
          marginX + contentWidth - 80,
          footerY,
          { width: 80, align: 'right', lineBreak: false }
        );

        doc.page.margins.bottom = oldBottom;
      }

      doc.end();
    });
  }

  /**
   * Desenha o cabeçalho institucional oficial no topo da página
   */
  private drawHeader(doc: typeof PDFDocument, options: ReportHeaderOptions, branding: BrandingInfo): number {
    const marginX = 30;
    const pageWidth = doc.page.width;
    const contentWidth = pageWidth - 2 * marginX;
    let y = 30;

    // Brasão / Logo institucional
    const brasaoPath = path.join(process.cwd(), 'assets', 'brasao.png');
    const logoPath = path.join(process.cwd(), 'assets', 'logo.png');

    let textStartX = marginX;
    if (fs.existsSync(brasaoPath)) {
      try {
        doc.image(brasaoPath, marginX, y, { width: 38, height: 38, fit: [38, 38] });
        textStartX = marginX + 46;
      } catch {
        // ignore
      }
    } else if (fs.existsSync(logoPath)) {
      try {
        doc.image(logoPath, marginX, y, { width: 48, height: 32, fit: [48, 32] });
        textStartX = marginX + 54;
      } catch {
        // ignore
      }
    }

    // Identificação Governamental
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#0f172a');
    doc.text(branding.municipalityName.toUpperCase(), textStartX, y, { width: contentWidth - (textStartX - marginX) - 80, lineBreak: false });

    doc.font('Helvetica').fontSize(8).fillColor('#334155');
    doc.text(branding.department, textStartX, y + 11, { lineBreak: false });

    doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#0051a2');
    doc.text(
      `${branding.systemTitle} — ${branding.systemSubtitle}`,
      textStartX,
      y + 21,
      { lineBreak: false }
    );

    if (options.unitName) {
      doc.font('Helvetica').fontSize(7).fillColor('#64748b');
      doc.text(
        `Unidade: ${options.unitName}${options.cnes ? ` (CNES: ${options.cnes})` : ''}`,
        textStartX,
        y + 30,
        { lineBreak: false }
      );
    }

    y += 42;

    // Faixa com Título Oficial do Relatório
    doc.rect(marginX, y, contentWidth, 20).fill('#0051a2');
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#ffffff');
    doc.text(options.title.toUpperCase(), marginX + 10, y + 5, { width: contentWidth - 20, align: 'center', lineBreak: false });
    y += 24;

    // Barra de Parâmetros e Filtros (se houver)
    if (options.filters && Object.keys(options.filters).length > 0) {
      const filterPairs = Object.entries(options.filters)
        .filter(([_, val]) => val !== undefined && val !== '')
        .map(([key, val]) => `${key}: ${val}`);

      if (filterPairs.length > 0) {
        doc.rect(marginX, y, contentWidth, 14).fill('#f1f5f9');
        doc.font('Helvetica').fontSize(6.5).fillColor('#475569');
        doc.text(
          `Filtros aplicados: ${filterPairs.join('  |  ')}`,
          marginX + 6,
          y + 3.5,
          { width: contentWidth - 12, ellipsis: true, lineBreak: false }
        );
        y += 18;
      }
    }

    return y + 4;
  }

  /**
   * Desenha barra de título de seção
   */
  private drawSectionTitle(doc: typeof PDFDocument, title: string, y: number): number {
    const marginX = 30;
    const contentWidth = doc.page.width - 2 * marginX;

    // Garante que não inicia uma seção colada ao rodapé sem espaço para a tabela
    if (y + 40 > doc.page.height - 50) {
      doc.addPage();
      y = 35;
    }

    doc.rect(marginX, y, contentWidth, 15).fill('#e2e8f0');
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#1e293b');
    doc.text(title.toUpperCase(), marginX + 6, y + 3.5, { lineBreak: false });
    return y + 19;
  }

  /**
   * Desenha cards horizontais de KPI
   */
  private drawKpiCards(
    doc: typeof PDFDocument,
    cards: Array<{ label: string; value: string | number; sub?: string; color?: string }>,
    y: number
  ): number {
    const marginX = 30;
    const contentWidth = doc.page.width - 2 * marginX;
    const gap = 8;
    const cardWidth = (contentWidth - gap * (cards.length - 1)) / cards.length;
    const cardHeight = 36;

    cards.forEach((card, idx) => {
      const cx = marginX + idx * (cardWidth + gap);
      // Card background
      doc.roundedRect(cx, y, cardWidth, cardHeight, 3).fillAndStroke('#f8fafc', '#cbd5e1');

      // Label
      doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#64748b');
      doc.text(card.label.toUpperCase(), cx + 5, y + 4, { width: cardWidth - 10, align: 'center', ellipsis: true, lineBreak: false });

      // Value
      doc.font('Helvetica-Bold').fontSize(13).fillColor(card.color || '#0f172a');
      doc.text(String(card.value), cx + 5, y + 13, { width: cardWidth - 10, align: 'center', lineBreak: false });

      // Sub
      if (card.sub) {
        doc.font('Helvetica').fontSize(5.5).fillColor('#94a3b8');
        doc.text(card.sub, cx + 5, y + 27, { width: cardWidth - 10, align: 'center', lineBreak: false });
      }
    });

    return y + cardHeight + 10;
  }

  /**
   * Desenha uma tabela com cabeçalho, linhas zebradas e quebra de página automática
   */
  private drawTable(
    doc: typeof PDFDocument,
    headers: Array<{ title: string; width: number; align?: 'left' | 'center' | 'right' }>,
    rows: Array<Array<string | number>>,
    startY: number,
    onPageBreak?: () => void
  ): number {
    const marginX = 30;
    const contentWidth = doc.page.width - 2 * marginX;
    const rowHeight = 14;
    const headerHeight = 15;
    let y = startY;

    const drawTableHeader = (curY: number) => {
      doc.rect(marginX, curY, contentWidth, headerHeight).fill('#0051a2');
      let curX = marginX;
      headers.forEach((h) => {
        doc.font('Helvetica-Bold').fontSize(7).fillColor('#ffffff');
        doc.text(h.title.toUpperCase(), curX + 2, curY + 3.5, {
          width: h.width - 4,
          align: h.align || 'left',
          ellipsis: true,
          lineBreak: false,
        });
        curX += h.width;
      });
      return curY + headerHeight;
    };

    y = drawTableHeader(y);

    rows.forEach((row, rIdx) => {
      // Verifica se precisa de quebra de página
      if (y + rowHeight > doc.page.height - 50) {
        doc.addPage();
        if (onPageBreak) onPageBreak();
        y = 35;
        y = drawTableHeader(y);
      }

      // Fundo zebrado
      const bgColor = rIdx % 2 === 0 ? '#ffffff' : '#f8fafc';
      doc.rect(marginX, y, contentWidth, rowHeight).fillAndStroke(bgColor, '#e2e8f0');

      let curX = marginX;
      row.forEach((cell, cIdx) => {
        const h = headers[cIdx];
        doc.font('Helvetica').fontSize(6.5).fillColor('#1e293b');
        doc.text(String(cell ?? ''), curX + 2, y + 3, {
          width: h ? h.width - 4 : 50,
          align: h?.align || 'left',
          ellipsis: true,
          lineBreak: false,
        });
        if (h) curX += h.width;
      });

      y += rowHeight;
    });

    return y + 8;
  }

  // =========================================================================
  // 1. RELATÓRIO DA CENTRAL DE REGULAÇÃO
  // =========================================================================
  async generateRegulationPdf(data: any, filters: any, user: any, mode: 'executive' | 'analytical' = 'executive'): Promise<Buffer> {
    const branding = await this.getBranding();
    const doc = this.createDoc(false);

    let y = this.drawHeader(
      doc,
      {
        title: 'Relatório Gerencial da Central de Regulação',
        filters: {
          Período: filters.startDate && filters.endDate ? `${filters.startDate} até ${filters.endDate}` : 'Geral',
          Prioridade: filters.risk || 'Todas',
          Status: filters.status || 'Todos',
          Origem: filters.origin || 'SINPeP + e-SUS',
          Modalidade: mode === 'analytical' ? 'Analítico (Completo)' : 'Executivo (Sintético)',
        },
        user,
      },
      branding
    );

    // Resumo Executivo (Cards de KPI)
    const counts = data.statusCounts || {};
    y = this.drawKpiCards(
      doc,
      [
        { label: 'Pendente Triagem', value: counts.to_evaluate || 0, color: '#f59e0b', sub: 'Aguardando médico regulador' },
        { label: 'Fila de Espera', value: counts.waiting_list || 0, color: '#0051a2', sub: 'Autorizadas aguardando vaga' },
        { label: 'Agendadas', value: counts.scheduled || 0, color: '#10b981', sub: 'Com data e local definidos' },
        { label: 'Devolvidas', value: counts.returned || 0, color: '#ef4444', sub: 'Inconsistência ou falta de dados' },
        { label: 'Total Geral', value: counts.total || 0, color: '#0f172a', sub: `e-SUS: ${counts.esus_total || 0} | SINPeP: ${counts.sinpep_total || 0}` },
      ],
      y
    );

    // Seção 1: Distribuição por Prioridade / Classificação de Risco
    y = this.drawSectionTitle(doc, '1. Distribuição de Demandas por Classificação de Risco', y);
    const riskRows = (data.riskBreakdown || []).map((r: any) => {
      const count = Number(r.count) || 0;
      const total = Number(counts.total) || 1;
      const pct = ((count / total) * 100).toFixed(1) + '%';
      return [r.risk || 'NÃO INFORMADO', count, pct];
    });
    y = this.drawTable(
      doc,
      [
        { title: 'Classificação de Prioridade', width: 250 },
        { title: 'Quantidade de Solicitações', width: 140, align: 'center' },
        { title: 'Participação (%)', width: 145, align: 'right' },
      ],
      riskRows.length > 0 ? riskRows : [['Nenhum dado encontrado', 0, '0%']],
      y
    );

    // Seção 2: Top Especialidades com Maior Volume
    y = this.drawSectionTitle(doc, '2. Top Especialidades com Maior Demanda Regulatória', y);
    const specRows = (data.bySpecialty || []).map((s: any) => [
      s.specialty_name,
      s.total_requests || 0,
      s.waiting || 0,
      s.scheduled || 0,
      s.esus_count || 0,
      s.sinpep_count || 0,
    ]);
    y = this.drawTable(
      doc,
      [
        { title: 'Especialidade / Procedimento', width: 185 },
        { title: 'Total', width: 60, align: 'center' },
        { title: 'Em Fila', width: 70, align: 'center' },
        { title: 'Agendadas', width: 70, align: 'center' },
        { title: 'e-SUS', width: 75, align: 'center' },
        { title: 'SINPeP', width: 75, align: 'center' },
      ],
      specRows.length > 0 ? specRows : [['Nenhuma especialidade registrada', 0, 0, 0, 0, 0]],
      y
    );

    // Seção 3: Demanda por UBS Solicitante
    y = this.drawSectionTitle(doc, '3. Encaminhamentos por Unidade Solicitante (UBS)', y);
    const ubsRows = (data.bySolicitingUnit || []).map((u: any) => {
      const tot = u.total_requests || 0;
      const ret = u.returned || 0;
      const rate = tot > 0 ? Math.round((ret / tot) * 100) + '%' : '0%';
      return [u.ubs_name, tot, u.scheduled || 0, ret, rate];
    });
    y = this.drawTable(
      doc,
      [
        { title: 'Unidade Básica de Saúde (UBS)', width: 235 },
        { title: 'Encaminhados', width: 80, align: 'center' },
        { title: 'Agendadas', width: 75, align: 'center' },
        { title: 'Devolvidas', width: 75, align: 'center' },
        { title: 'Tx. Devolução', width: 70, align: 'right' },
      ],
      ubsRows.length > 0 ? ubsRows : [['Nenhuma UBS encontrada', 0, 0, 0, '0%']],
      y
    );

    return this.finalizeDoc(doc, user);
  }

  // =========================================================================
  // 2. FOLHA DE PRESENÇA E ACOLHIMENTO DA RECEPÇÃO
  // =========================================================================
  async generateReceptionAttendancePdf(data: any, filters: any, user: any): Promise<Buffer> {
    const branding = await this.getBranding();
    const doc = this.createDoc(true); // Paisagem para caber colunas completas

    let y = this.drawHeader(
      doc,
      {
        title: 'Folha Oficial de Presença e Acolhimento Ambulatorial',
        filters: {
          Data: filters.date ? filters.date : 'Todas as datas',
          Total: `${data.statusTotals?.total || 0} acolhimentos`,
        },
        user,
      },
      branding
    );

    // Cards da Fila do Dia
    const st = data.statusTotals || {};
    y = this.drawKpiCards(
      doc,
      [
        { label: 'Total Acolhido', value: st.total || 0, color: '#0f172a', sub: `e-SUS: ${st.from_esus || 0} | SINPeP: ${st.from_sinpep || 0}` },
        { label: 'Na Sala de Espera', value: st.waiting || 0, color: '#0051a2', sub: 'Aguardando chamada' },
        { label: 'Em Atendimento', value: st.in_attendance || 0, color: '#f59e0b', sub: 'Em consulta/procedimento' },
        { label: 'Atendidos', value: st.completed || 0, color: '#10b981', sub: 'Concluídos com sucesso' },
        { label: 'Faltas (No-Show)', value: st.no_show || 0, color: '#ef4444', sub: 'Paciente não compareceu' },
      ],
      y
    );

    // Tabela Nominal de Presença
    y = this.drawSectionTitle(doc, 'Lista Nominal de Presença e Comparecimento dos Pacientes', y);
    const attList = (data.attendanceList || []).map((item: any, idx: number) => {
      let stLabel = item.status || 'AGUARDANDO';
      if (item.status === 'NAO_COMPARECEU') stLabel = 'FALTA';
      if (item.status === 'FINALIZADO') stLabel = 'ATENDIDO';
      return [
        `${item.queue_order || idx + 1}º`,
        item.time || '--:--',
        item.patient_name || 'NOME NÃO REGISTRADO',
        item.patient_cpf || item.patient_cns || 'N/A',
        item.specialty_name || 'CLÍNICA GERAL',
        item.priority || 'ELETIVO',
        stLabel,
        item.origin || 'SINPeP',
        '_____________________', // Campo para visto / assinatura
      ];
    });

    const headers = [
      { title: 'Ordem', width: 38, align: 'center' as const },
      { title: 'Horário', width: 44, align: 'center' as const },
      { title: 'Nome do Paciente', width: 175 },
      { title: 'CPF / CNS', width: 95 },
      { title: 'Especialidade', width: 110 },
      { title: 'Prioridade', width: 70, align: 'center' as const },
      { title: 'Situação', width: 68, align: 'center' as const },
      { title: 'Origem', width: 65, align: 'center' as const },
      { title: 'Visto / Assinatura', width: 117, align: 'center' as const },
    ];

    y = this.drawTable(doc, headers, attList.length > 0 ? attList : [['-', '-', 'Nenhum paciente registrado', '-', '-', '-', '-', '-', '-']], y);

    return this.finalizeDoc(doc, user);
  }

  // =========================================================================
  // 3. RELATÓRIO DO PERFIL EPIDEMIOLÓGICO
  // =========================================================================
  async generateEpidemiologicalPdf(data: any, user: any): Promise<Buffer> {
    const branding = await this.getBranding();
    const doc = this.createDoc(false);

    let y = this.drawHeader(
      doc,
      {
        title: 'Boletim do Perfil Epidemiológico Municipal',
        filters: {
          Base: 'SINPeP + e-SUS Regulação Integrados',
          Consolidação: 'Histórico de Morbidades e Diagnósticos',
        },
        user,
      },
      branding
    );

    // Cards de Comorbidades
    const com = data.comorbidities || {};
    y = this.drawKpiCards(
      doc,
      [
        { label: 'Hipertensos', value: com.hypertensive || 0, color: '#ef4444', sub: 'Cadastrados na anamnese' },
        { label: 'Diabéticos', value: com.diabetic || 0, color: '#3b82f6', sub: 'Cadastrados na anamnese' },
        { label: 'Fumantes', value: com.smoker || 0, color: '#f97316', sub: 'Uso contínuo de tabaco' },
        { label: 'Oncológicos', value: com.oncological || 0, color: '#a855f7', sub: 'Em acompanhamento' },
        { label: 'PcD', value: com.pcd || 0, color: '#10b981', sub: 'Pessoa com Deficiência' },
      ],
      y
    );

    // Seção 1: Top 10 Diagnósticos (CID-10 Integrado)
    y = this.drawSectionTitle(doc, 'Top 10 Diagnósticos Mais Incidentes (CID-10 Integrado)', y);
    const cidRows = (data.topCid || []).map((c: any) => [
      c.code,
      c.description || 'Descrição não catalogada',
      c.count || 0,
      c.from_esus || 0,
      c.from_sinpep || 0,
    ]);

    y = this.drawTable(
      doc,
      [
        { title: 'CID-10', width: 65, align: 'center' },
        { title: 'Descrição Oficial da Doença', width: 285 },
        { title: 'Total Ocorrências', width: 75, align: 'center' },
        { title: 'e-SUS', width: 55, align: 'center' },
        { title: 'SINPeP', width: 55, align: 'center' },
      ],
      cidRows.length > 0 ? cidRows : [['-', 'Nenhum CID encontrado', 0, 0, 0]],
      y
    );

    return this.finalizeDoc(doc, user);
  }

  // =========================================================================
  // 4. RELATÓRIO DE ENCAMINHAMENTOS DA UBS (SOLICITANTE)
  // =========================================================================
  async generateSolicitorPdf(data: any, filters: any, user: any, unitName?: string): Promise<Buffer> {
    const branding = await this.getBranding();
    const doc = this.createDoc(false);

    let y = this.drawHeader(
      doc,
      {
        title: 'Relatório de Encaminhamentos da Atenção Básica (UBS)',
        unitName: unitName || 'Unidade Básica de Saúde',
        filters: {
          Período: filters.startDate && filters.endDate ? `${filters.startDate} até ${filters.endDate}` : 'Geral',
          Status: filters.status || 'Todos',
          Origem: filters.origin || 'SINPeP + e-SUS',
        },
        user,
      },
      branding
    );

    const counts = data.statusCounts || {};
    y = this.drawKpiCards(
      doc,
      [
        { label: 'Total Solicitado', value: counts.total || 0, color: '#0f172a', sub: 'Guias geradas pela UBS' },
        { label: 'Agendadas', value: counts.scheduled || 0, color: '#10b981', sub: 'Com data confirmada' },
        { label: 'Em Espera', value: counts.waiting_list || 0, color: '#0051a2', sub: 'Aguardando vaga' },
        { label: 'Pendente Triagem', value: counts.to_evaluate || 0, color: '#f59e0b', sub: 'Em análise pelo médico' },
        { label: 'Devolvidas', value: counts.returned || 0, color: '#ef4444', sub: 'Necessitam correção' },
      ],
      y
    );

    // Seção Especialidades mais encaminhadas
    y = this.drawSectionTitle(doc, '1. Especialidades com Maior Volume de Encaminhamentos', y);
    const specRows = (data.bySpecialty || []).map((s: any) => [s.specialty_name, s.count || 0]);
    y = this.drawTable(
      doc,
      [
        { title: 'Especialidade Médica', width: 380 },
        { title: 'Total Encaminhado', width: 155, align: 'center' },
      ],
      specRows.length > 0 ? specRows : [['Nenhuma especialidade', 0]],
      y
    );

    // Seção Motivos de Devolução
    if (data.returnReasons && data.returnReasons.length > 0) {
      y = this.drawSectionTitle(doc, '2. Principais Inconsistências / Motivos de Devolução', y);
      const reasonRows = data.returnReasons.map((r: any) => [r.reason, r.count || 0]);
      y = this.drawTable(
        doc,
        [
          { title: 'Motivo Indicado pela Central de Regulação', width: 420 },
          { title: 'Qtd', width: 115, align: 'center' },
        ],
        reasonRows,
        y
      );
    }

    return this.finalizeDoc(doc, user);
  }

  // =========================================================================
  // 5. RELATÓRIO DE PRODUÇÃO CLÍNICA INDIVIDUAL (MÉDICO)
  // =========================================================================
  async generateDoctorProductionPdf(data: any, filters: any, user: any): Promise<Buffer> {
    const branding = await this.getBranding();
    const doc = this.createDoc(false);

    let y = this.drawHeader(
      doc,
      {
        title: 'Extrato de Produção Clínica Individual do Médico',
        filters: {
          Profissional: user?.name || 'Médico',
          Período: data.period?.start && data.period?.end ? `${data.period.start} até ${data.period.end}` : 'Geral',
        },
        user,
      },
      branding
    );

    y = this.drawKpiCards(
      doc,
      [
        { label: 'Consultas Realizadas', value: data.totalConsultations || 0, color: '#0051a2', sub: 'Prontuários eletrônicos' },
        { label: 'Média Mensal', value: data.monthlyEvolution?.length > 0 ? Math.round((data.totalConsultations || 0) / data.monthlyEvolution.length) : 0, color: '#10b981', sub: 'Consultas/mês' },
        { label: 'Meses Analisados', value: data.monthlyEvolution?.length || 0, color: '#64748b', sub: 'Período no sistema' },
      ],
      y
    );

    // Tabela de Evolução Mensal
    y = this.drawSectionTitle(doc, '1. Evolução Mensal de Atendimentos Clínicos', y);
    const mRows = (data.monthlyEvolution || []).map((m: any) => [m.month, m.count]);
    y = this.drawTable(
      doc,
      [
        { title: 'Mês (Ano-Mês)', width: 270, align: 'center' },
        { title: 'Atendimentos Realizados', width: 265, align: 'center' },
      ],
      mRows.length > 0 ? mRows : [['Nenhum atendimento', 0]],
      y
    );

    // Tabela de Top CIDs Diagnosticados
    y = this.drawSectionTitle(doc, '2. Diagnósticos Mais Frequentes (Top CID-10)', y);
    const cidRows = (data.topCid10 || []).map((c: any) => [c.cid10, c.count]);
    y = this.drawTable(
      doc,
      [
        { title: 'Código e Descrição do CID-10', width: 380 },
        { title: 'Ocorrências', width: 155, align: 'center' },
      ],
      cidRows.length > 0 ? cidRows : [['Nenhum CID diagnosticado', 0]],
      y
    );

    return this.finalizeDoc(doc, user);
  }

  // =========================================================================
  // 6. PRODUÇÃO AMBULATORIAL E OCUPAÇÃO DA UNIDADE (COORDENADOR)
  // =========================================================================
  async generateUnitOperationalPdf(data: any, filters: any, user: any, unitName?: string): Promise<Buffer> {
    const branding = await this.getBranding();
    const doc = this.createDoc(false);

    let y = this.drawHeader(
      doc,
      {
        title: 'Relatório de Produção e Ocupação Ambulatorial',
        unitName: unitName || 'Unidade de Saúde',
        filters: {
          Período: data.period?.start && data.period?.end ? `${data.period.start} até ${data.period.end}` : 'Geral',
        },
        user,
      },
      branding
    );

    const occ = data.occupancy || {};
    const att = data.attendance || {};
    y = this.drawKpiCards(
      doc,
      [
        { label: 'Vagas Ofertadas', value: occ.totalSlots || 0, color: '#0f172a', sub: 'Capacidade instalada' },
        { label: 'Vagas Agendadas', value: occ.bookedSlots || 0, color: '#0051a2', sub: 'Ocupação de agenda' },
        { label: 'Taxa de Ocupação', value: `${occ.occupancyRate || 0}%`, color: '#10b981', sub: 'Eficiência de escala' },
        { label: 'Faltas Registradas', value: att.noShow || 0, color: '#ef4444', sub: `Absenteísmo: ${att.noShowRate || 0}%` },
      ],
      y
    );

    // Tabela de Produção por Profissional
    y = this.drawSectionTitle(doc, 'Produção Ambulatorial por Profissional Médico', y);
    const docRows = (data.productionByDoctor || []).map((d: any) => [
      d.name || 'PROFISSIONAL',
      `${d.crm || ''}/${d.crm_state || ''}`,
      d.specialty_name || 'Geral',
      d.booked_slots || 0,
      d.completed_records || 0,
    ]);

    y = this.drawTable(
      doc,
      [
        { title: 'Médico(a)', width: 195 },
        { title: 'CRM/UF', width: 75, align: 'center' },
        { title: 'Especialidade', width: 110 },
        { title: 'Agendados', width: 75, align: 'center' },
        { title: 'Concluídos', width: 80, align: 'center' },
      ],
      docRows.length > 0 ? docRows : [['Nenhum profissional com agenda', '-', '-', 0, 0]],
      y
    );

    return this.finalizeDoc(doc, user);
  }
}

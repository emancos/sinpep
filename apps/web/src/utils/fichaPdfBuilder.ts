import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Visual PDF generator for SISREG Ficha strictly respecting the specifications,
 * colors, fonts, and dynamic auto-scaling of ReportLab Python code (FichaPdfBuilder).
 */

const HEADER_GREEN_COLOR: [number, number, number] = [0, 102, 51]; // #006633
const YELLOW_LINE_COLOR: [number, number, number] = [255, 204, 0]; // #FFCC00
const LIGHT_GRAY_COLOR: [number, number, number] = [244, 244, 244]; // #F4F4F4
const BORDER_GRAY_COLOR: [number, number, number] = [204, 204, 204]; // #CCCCCC

let activePdfFontName = 'helvetica';

const cleanSisregDateTime = (val: any): string => {
  if (!val || val === '---') return '---';
  let s = String(val);

  // 1. Replace garbage / encoding glitches (%Ï, %ï, Â•, •, ·, ●, etc.) with internal delimiter
  s = s.replace(/&bull;|&#8226;|&#9679;|[%ÏïÂ•·*|●]+/g, '|||');

  // 2. Split by delimiter to clean individual segments
  const parts = s.split('|||').map(part => {
    let t = part.trim();
    const tokens = t.split(/\s+/);
    if (tokens.length > 1 && tokens.every(tok => tok.length === 1)) {
      return tokens.join('');
    }
    return t.replace(/\s+/g, ' ');
  }).filter(Boolean);

  const sep = activePdfFontName === 'helvetica' ? ' - ' : ' ● ';

  if (parts.length > 1) {
    return parts.join(sep);
  }

  let result = parts[0] || '---';
  result = result.replace(/(SEG|TER|QUA|QUI|SEX|SAB|DOM)(\d)/i, `$1${sep}$2`);
  result = result.replace(/(\d{4})(\d{2}[h:])/i, `$1${sep}$2`);
  return result;
};

const formatSisregDate = (dateStr: any) => {
  if (!dateStr || dateStr === '---') return '---';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return String(dateStr);
    if (String(dateStr).includes('T') || String(dateStr).endsWith('Z')) {
      return date.toLocaleString('pt-BR', { timeZone: 'UTC' });
    }
    return date.toLocaleString('pt-BR');
  } catch {
    return String(dateStr);
  }
};

let cachedArialNormalBase64: string | null = null;
let cachedArialBoldBase64: string | null = null;

const fetchFontAsBase64 = async (url: string): Promise<string | null> => {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('text/html')) return null;
    const buffer = await res.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    // Valida se o buffer não é HTML (< = 60 em ASCII) e possui tamanho mínimo para uma fonte TTF (> 1000 bytes)
    if (bytes.length < 1000 || bytes[0] === 60) return null;
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  } catch {
    return null;
  }
};

const getArialFonts = async () => {
  if (!cachedArialNormalBase64) {
    cachedArialNormalBase64 = await fetchFontAsBase64('/fonts/arial.ttf');
  }
  if (!cachedArialBoldBase64) {
    cachedArialBoldBase64 = (await fetchFontAsBase64('/fonts/arialbd.ttf')) || (await fetchFontAsBase64('/fonts/arial-bold.ttf'));
  }
  return { normal: cachedArialNormalBase64, bold: cachedArialBoldBase64 };
};

const setupArial = (doc: jsPDF, fonts: { normal: string | null; bold: string | null }): string => {
  if (!fonts.normal) {
    activePdfFontName = 'helvetica';
    return 'helvetica';
  }
  try {
    doc.addFileToVFS('arial.ttf', fonts.normal);
    doc.addFont('arial.ttf', 'arial', 'normal');

    if (fonts.bold) {
      doc.addFileToVFS('arialbd.ttf', fonts.bold);
      doc.addFont('arialbd.ttf', 'arial', 'bold');
    } else {
      doc.addFont('arial.ttf', 'arial', 'bold');
    }
    doc.setFont('arial', 'normal');
    activePdfFontName = 'arial';
    return 'arial';
  } catch (e) {
    console.warn('Falha ao configurar fonte Arial no jsPDF. Usando helvetica.', e);
    activePdfFontName = 'helvetica';
    return 'helvetica';
  }
};

const createGetValue = (ficha: any, code: string) => {
  const exportData = ficha?.exportData || {};
  return (key: string, fallback: string = '---') => {
    if ((key === 'Telefone(s)' || key === 'Telefone') && ficha?.isLinkedToRegulasb && Array.isArray(ficha?.regulasbPhones) && ficha.regulasbPhones.length > 0) {
      return `${ficha.regulasbPhones.join(', ')} [RegulaSB]`;
    }
    if ((key === 'Telefone(s)' || key === 'Telefone') && exportData[key]) {
      const raw = exportData[key];
      if (Array.isArray(raw)) return raw.join(', ');
      return String(raw).split(',').map((s: string) => s.trim()).filter(Boolean).join(', ');
    }
    if (key === 'Data e Horário de Atendimento' && exportData[key]) {
      return cleanSisregDateTime(exportData[key]);
    }

    const grupos = ficha?.rawJson?.procedimentos_agrupados || ficha?.procedimentos_agrupados;
    if (grupos && Array.isArray(grupos) && grupos.length > 1) {
      if (key === 'Procedimentos Solicitados') return grupos.map((p: any) => p.procedureName).join('\n');
      if (key === 'Cód. Unificado') return grupos.map((p: any) => p.sigtapCode || '---').join('\n');
      if (key === 'Cód. Interno') return grupos.map((p: any) => p.internalCode || '---').join('\n');
    }

    if (exportData[key]) return exportData[key];

    // Smart fallbacks in case exportData is incomplete
    switch (key) {
      case 'Chave de Confirmação': return ficha?.confirmationKey || ficha?.request?.confirmationKey || ficha?.rawJson?.chave_confirmacao || '---';
      case 'Unidade Executante': return ficha?.executionUnit || ficha?.request?.scheduledLocation || ficha?.rawJson?.nome_unidade_executante || '---';
      case 'Unidade Solicitante': return ficha?.request?.requesterUnit || ficha?.rawJson?.nome_central_solicitante || '---';
      case 'Nome do Paciente': return ficha?.patientName || ficha?.patient?.name || ficha?.rawJson?.no_usuario || '---';
      case 'CNS': return ficha?.patientCns || ficha?.cns || ficha?.patient?.cns || ficha?.rawJson?.cns_usuario || '---';
      case 'Data de Nascimento': return ficha?.patient?.birthDate || (ficha?.rawJson?.dt_nascimento_usuario ? String(ficha.rawJson.dt_nascimento_usuario).split('T')[0].split('-').reverse().join('/') : '---');
      case 'Sexo': return ficha?.patient?.gender || ficha?.rawJson?.sexo_usuario || '---';
      case 'Nome da Mãe': return ficha?.patient?.motherName || ficha?.rawJson?.no_mae_usuario || '---';
      case 'Código da Solicitação': return ficha?.sisregRequestCode || ficha?.request?.code || ficha?.rawJson?.codigo_solicitacao || code || '---';
      case 'Situação Atual': return ficha?.status || ficha?.request?.status || ficha?.rawJson?.status_solicitacao || '---';
      case 'Nome Médico Solicitante': return ficha?.request?.requesterName || ficha?.rawJson?.nome_medico_solicitante || '---';
      case 'Vaga Solicitada': return ficha?.request?.requestedVacancy || ficha?.rawJson?.nome_unidade_desejada || '---';
      case 'Diagnóstico Inicial': return ficha?.request?.initialDiagnosis || ficha?.rawJson?.descricao_cid_solicitado || '---';
      case 'CID': return ficha?.cidCode || ficha?.request?.cid || ficha?.rawJson?.codigo_cid_agendado || '---';
      case 'Risco': return ficha?.request?.risk || '---';
      case 'Central Reguladora': return ficha?.regulatoryCenterName || ficha?.request?.regulatoryCenter || ficha?.rawJson?.nome_central_reguladora || '---';
      case 'Procedimentos Solicitados': return ficha?.procedureName || ficha?.procedure || ficha?.request?.requestedProcedures || ficha?.rawJson?.descricao_interna_procedimento || '---';
      case 'Cód. Unificado': return ficha?.procedureSigtapCode || ficha?.rawJson?.codigo_sigtap_procedimento || '---';
      case 'Cód. Interno': return ficha?.rawJson?.codigo_interno_procedimento || '---';
      case 'Data e Horário de Atendimento': {
        let raw = ficha?.appointmentDate ? formatSisregDate(ficha.appointmentDate) : '---';
        if (raw === '---' && ficha?.scheduling?.date) {
          raw = ficha.scheduling.date;
          if (ficha.scheduling.time && !raw.includes(ficha.scheduling.time)) {
            raw += ` ● ${ficha.scheduling.time}`;
          }
        }
        return cleanSisregDateTime(raw);
      }
      case 'Data Solicitação': return ficha?.request?.requestDate || ((ficha?.rawJson?.data_solicitacao || ficha?.rawJson?.dt_solicitacao) ? formatSisregDate(ficha.rawJson.data_solicitacao || ficha.rawJson.dt_solicitacao) : '---');
      case 'Telefone':
      case 'Telefone(s)': {
        const raw = ficha?.patient?.phone || ficha?.rawJson?.nu_telefone || ficha?.rawJson?.telefone || ficha?.rawJson?.telefone_usuario || '';
        if (!raw || raw === '---' || String(raw).trim() === '') return '---';
        if (Array.isArray(raw)) return raw.join(', ');
        return String(raw).split(',').map((s: string) => s.trim()).filter(Boolean).join(', ');
      }
      default: return fallback;
    }
  };
};

export const gerarFichaPDF = async (ficha: any, code: string) => {
  const arialFonts = await getArialFonts();
  const getValue = createGetValue(ficha, code);

  // Scaling simulation loop to fit into exactly 1 page (or down to min 0.55)
  let bestScale = 1.0;
  for (let s = 1.0; s >= 0.55; s = Math.round((s - 0.05) * 100) / 100) {
    const testDoc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    setupArial(testDoc, arialFonts);
    const pages = renderFichaDocument(testDoc, ficha, getValue, s);
    if (pages === 1) {
      bestScale = s;
      break;
    }
    bestScale = s;
  }

  // Real document for printing
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  setupArial(doc, arialFonts);
  renderFichaDocument(doc, ficha, getValue, bestScale);

  // Print dialog must open automatically with generated PDF
  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
};

export const gerarFichasEmLotePDF = async (fichasInfo: { ficha: any; code: string }[]) => {
  if (!fichasInfo || fichasInfo.length === 0) return;

  const arialFonts = await getArialFonts();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  setupArial(doc, arialFonts);

  for (let i = 0; i < fichasInfo.length; i++) {
    const { ficha, code } = fichasInfo[i];
    const getValue = createGetValue(ficha, code);

    // Scaling simulation loop to fit into exactly 1 page (or down to min 0.55)
    let bestScale = 1.0;
    for (let s = 1.0; s >= 0.55; s = Math.round((s - 0.05) * 100) / 100) {
      const testDoc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      setupArial(testDoc, arialFonts);
      const pages = renderFichaDocument(testDoc, ficha, getValue, s);
      if (pages === 1) {
        bestScale = s;
        break;
      }
      bestScale = s;
    }

    if (i > 0) {
      doc.addPage();
    }
    renderFichaDocument(doc, ficha, getValue, bestScale);
  }

  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
};

function renderFichaDocument(
  doc: jsPDF,
  ficha: any,
  getValue: (k: string, fb?: string) => string,
  scale: number
): number {
  const margin = 20;
  const contentWidth = doc.internal.pageSize.getWidth() - (margin * 2);
  const exportData = ficha?.exportData || {};

  let currentY = margin;

  const fontSizeLabel = Math.max(4.5, 6.0 * scale);
  const fontSizeValue = Math.max(5.5, 7.0 * scale);
  const fontSizeLarge = Math.max(6.5, 9.0 * scale);
  const fontSizeTitle = Math.max(5.5, 7.0 * scale);
  const fontSizeKey = Math.max(9.0, 12.0 * scale);
  const fontSizeNotice = Math.max(6.0, 9.0 * scale);

  const tablePadding = Math.max(0.5, 1.0 * scale);
  const sidePadding = Math.max(2.0, 4.0 * scale);
  const headerHeight = Math.max(10.0, 14.0 * scale);
  const yellowLineHeight = Math.max(1.0, 2.8 * scale);

  // Draw section header identical to ReportLab TextoComSombra
  const drawHeader = (title: string) => {
    doc.setFillColor(HEADER_GREEN_COLOR[0], HEADER_GREEN_COLOR[1], HEADER_GREEN_COLOR[2]);
    doc.rect(margin, currentY, contentWidth, headerHeight, 'F');

    doc.setFont('arial', 'bold');
    doc.setFontSize(fontSizeLarge);

    // Shadow effect
    doc.setTextColor(0, 34, 17); // #002211
    doc.text(title, margin + sidePadding + 0.75, currentY + headerHeight - 3 + 0.75);
    doc.setTextColor(255, 255, 255); // White
    doc.text(title, margin + sidePadding, currentY + headerHeight - 3);

    // Yellow divider line
    currentY += headerHeight;
    doc.setFillColor(YELLOW_LINE_COLOR[0], YELLOW_LINE_COLOR[1], YELLOW_LINE_COLOR[2]);
    doc.rect(margin, currentY, contentWidth, yellowLineHeight, 'F');
    currentY += yellowLineHeight;
  };

  // Logic so only scheduled/authorized requests have confirmation key and "UNIDADE EXECUTANTE"
  const currentStatus = (getValue('Situação Atual') || ficha?.request?.status || '').toUpperCase();
  const confirmationKey = getValue('Chave de Confirmação');
  const executionUnit = getValue('Unidade Executante');

  const isScheduledOrAuthorized = currentStatus.includes('AGENDAD') ||
    currentStatus.includes('AUTORIZAD') ||
    currentStatus.includes('CONFIRMAD') ||
    currentStatus.includes('APROVAD') ||
    Boolean(executionUnit && executionUnit !== '---') ||
    Boolean(confirmationKey && confirmationKey !== '---');

  const hasConfirmationKey = Boolean(confirmationKey && confirmationKey !== '---');

  // 1. Confirmation Key (Only scheduled/authorized)
  if (hasConfirmationKey) {
    doc.setFont('arial', 'bold');
    doc.setFontSize(fontSizeTitle);
    doc.setTextColor(0, 0, 0);
    doc.text("Chave de Confirmação:", margin + sidePadding, currentY + fontSizeTitle + 4);
    currentY += fontSizeTitle + 6;

    doc.setFontSize(fontSizeKey);
    doc.text(confirmationKey, margin + sidePadding, currentY + fontSizeKey);
    currentY += fontSizeKey + 8;
  }

  // Helper to draw tabular sections in pairs (Even Row = Labels, Odd Row = Values)
  const drawSectionPairs = (pairs: { labels: any[]; values: any[]; colWidths: number[] }[]) => {
    const body: any[] = [];

    pairs.forEach((pair, pairIdx) => {
      const backgroundColor = pairIdx % 2 === 0 ? [255, 255, 255] : LIGHT_GRAY_COLOR;

      // Labels Row
      const labelRow = pair.labels.map((label: any) => {
        const isObject = typeof label === 'object' && label !== null;
        const textContent = isObject ? label.content : String(label);
        const colSpan = isObject ? (label.colSpan || 1) : 1;
        return {
          content: textContent,
          colSpan,
          styles: {
            fontStyle: 'bold' as 'bold',
            fontSize: fontSizeLabel,
            textColor: [0, 0, 0],
            fillColor: backgroundColor,
            cellPadding: { top: tablePadding * 2, bottom: 0, left: sidePadding, right: sidePadding }
          }
        };
      });
      body.push(labelRow);

      // Values Row
      const valueRow = pair.values.map((val) => {
        const isObject = typeof val === 'object' && val !== null;
        const textContent = isObject ? val.content : String(val);
        const colSpan = isObject ? (val.colSpan || 1) : 1;
        const customColor = isObject && val.color ? val.color : [0, 0, 0];
        const isBold = isObject && val.bold;
        const customFontSize = isObject && val.fontSize ? val.fontSize : fontSizeValue;

        return {
          content: textContent,
          colSpan,
          styles: {
            fontStyle: (isBold ? 'bold' : 'normal') as 'bold' | 'normal',
            fontSize: customFontSize,
            textColor: customColor,
            fillColor: backgroundColor,
            cellPadding: { top: 1, bottom: tablePadding * 2, left: sidePadding, right: sidePadding }
          }
        };
      });
      body.push(valueRow);
    });

    const colStyles: Record<number, any> = {};
    pairs[0].colWidths.forEach((w, idx) => {
      colStyles[idx] = { cellWidth: contentWidth * (w / 100) };
    });

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      tableWidth: contentWidth,
      theme: 'plain',
      styles: { font: 'arial' as any },
      body,
      columnStyles: colStyles
    });

    currentY = (doc as any).lastAutoTable.finalY;
  };

  // 2. Unidade Solicitante
  drawHeader("UNIDADE SOLICITANTE");
  drawSectionPairs([{
    labels: ["Unidade Solicitante:", "Cód. CNES:", "Op. Solicitante:", "Op. Videofonista:"],
    values: [getValue('Unidade Solicitante'), getValue('Cód. CNES'), getValue('Op. Solicitante'), getValue('Op. Videofonista')],
    colWidths: [35, 20, 25, 20]
  }]);

  // 3. Unidade Executante
  if (isScheduledOrAuthorized) {
    drawHeader("UNIDADE EXECUTANTE");
    drawSectionPairs([
      {
        labels: ["Unidade Executante:", "Cód. CNES:", "Op. Autorizador:", "Vaga Consumida:"],
        values: [getValue('Unidade Executante'), getValue('Cód. CNES'), getValue('Op. Autorizador'), getValue('Vaga Consumida')],
        colWidths: [35, 15, 25, 25]
      },
      {
        labels: ["Endereço:", "Número:", "Complemento:", "Data Aprovação:"],
        values: [getValue('Endereço'), getValue('Número'), getValue('Complemento'), getValue('Data Aprovação')],
        colWidths: [35, 15, 25, 25]
      },
      {
        labels: ["Telefone:", "CEP:", "Bairro:", "Município:"],
        values: [getValue('Telefone'), getValue('CEP'), getValue('Bairro'), getValue('Município')],
        colWidths: [35, 15, 25, 25]
      },
      {
        labels: [
          "Profissional Executante:",
          { content: "Data e Horário de Atendimento:", colSpan: 3 }
        ],
        values: [
          getValue('Profissional Executante'),
          { content: getValue('Data e Horário de Atendimento'), colSpan: 3, bold: true, fontSize: fontSizeLarge }
        ],
        colWidths: [35, 15, 25, 25]
      }
    ]);
  }

  // 4. Dados do Paciente
  drawHeader("DADOS DO PACIENTE");
  drawSectionPairs([
    {
      labels: ["CNS:", "", "", ""],
      values: [{ content: getValue('CNS'), colSpan: 4, color: [0, 0, 255], bold: true }],
      colWidths: [25, 25, 25, 25]
    },
    {
      labels: ["Nome do Paciente", "Nome Social/Apelido:", "Data de Nascimento:", "Sexo:"],
      values: [getValue('Nome do Paciente'), getValue('Nome Social/Apelido'), getValue('Data de Nascimento'), getValue('Sexo')],
      colWidths: [25, 25, 25, 25]
    },
    {
      labels: ["Nome da Mãe", "", "Raça:", "Tipo Sanguíneo:"],
      values: [{ content: getValue('Nome da Mãe'), colSpan: 2 }, getValue('Raça'), getValue('Tipo Sanguíneo')],
      colWidths: [25, 25, 25, 25]
    },
    {
      labels: ["Nacionalidade:", "Município de Nascimento:", "", ""],
      values: [getValue('Nacionalidade'), { content: getValue('Município de Nascimento'), colSpan: 3 }],
      colWidths: [25, 25, 25, 25]
    },
    {
      labels: ["Tipo Logradouro:", "Logradouro:", "", "Complemento:"],
      values: [getValue('Tipo Logradouro'), { content: getValue('Logradouro'), colSpan: 2 }, getValue('Complemento')],
      colWidths: [25, 25, 25, 25]
    },
    {
      labels: ["Número:", "Bairro:", "", "CEP:"],
      values: [getValue('Número'), { content: getValue('Bairro'), colSpan: 2 }, getValue('CEP')],
      colWidths: [25, 25, 25, 25]
    },
    {
      labels: ["País de Residência:", "Município de Residência:", "", ""],
      values: [getValue('País de Residência'), { content: getValue('Município de Residência'), colSpan: 3 }],
      colWidths: [25, 25, 25, 25]
    },
    {
      labels: ["Telefone(s):", "", "", ""],
      values: [{ content: getValue('Telefone(s)'), colSpan: 4, color: [0, 0, 255] }],
      colWidths: [25, 25, 25, 25]
    },
    {
      labels: ["Laudo / Justificativa:", "", "", ""],
      values: [{ content: getValue('Laudo / Justificativa'), colSpan: 4 }],
      colWidths: [25, 25, 25, 25]
    }
  ]);

  // 5. Dados da Solicitação
  drawHeader("DADOS DA SOLICITAÇÃO");

  let riskColor = [0, 0, 0];
  const riskText = getValue('Risco').toUpperCase();
  if (riskText.includes('AZUL')) riskColor = [0, 0, 255];
  else if (riskText.includes('VERMELHO')) riskColor = [220, 38, 38];
  else if (riskText.includes('AMARELO')) riskColor = [217, 119, 6];
  else if (riskText.includes('VERDE')) riskColor = [16, 185, 129];

  drawSectionPairs([
    {
      labels: ["Código da Solicitação:", "Situação Atual:", "", ""],
      values: [
        { content: getValue('Código da Solicitação'), colSpan: 2, color: [0, 0, 255], bold: true },
        { content: getValue('Situação Atual'), colSpan: 2 }
      ],
      colWidths: [30, 15, 35, 20]
    },
    {
      labels: ["CPF do Médico Solicitante:", "CRM:", "Nome Médico Solicitante:", "Vaga Solicitada:"],
      values: [getValue('CPF do Médico Solicitante'), getValue('CRM'), getValue('Nome Médico Solicitante'), getValue('Vaga Solicitada')],
      colWidths: [30, 15, 35, 20]
    },
    {
      labels: ["Diagnóstico Inicial:", "", "CID:", "Risco:"],
      values: [
        { content: getValue('Diagnóstico Inicial'), colSpan: 2 },
        getValue('CID'),
        { content: getValue('Risco'), color: riskColor, bold: true }
      ],
      colWidths: [30, 15, 35, 20]
    },
    {
      labels: ["Central Reguladora:", "", "", ""],
      values: [{ content: getValue('Central Reguladora'), colSpan: 4 }],
      colWidths: [30, 15, 35, 20]
    },
    {
      labels: ["Unidade Desejada:", "", "Data Desejada:", "Data Solicitação:"],
      values: [{ content: getValue('Unidade Desejada'), colSpan: 2 }, getValue('Data Desejada'), getValue('Data Solicitação')],
      colWidths: [30, 15, 35, 20]
    },
    {
      labels: ["Procedimentos Solicitados:", "", "Cód. Unificado:", "Cód. Interno:"],
      values: [{ content: getValue('Procedimentos Solicitados'), colSpan: 2 }, getValue('Cód. Unificado'), getValue('Cód. Interno')],
      colWidths: [30, 15, 35, 20]
    }
  ]);

  // Generic helper for dynamic blocks (Notices, Preparations, and History)
  const drawDynamicList = (title: string, items: { header: string; content: string }[]) => {
    if (!items || items.length === 0) return;
    drawHeader(title);

    const body: any[] = [];
    items.forEach(item => {
      body.push([{
        content: item.header,
        styles: { fontStyle: 'bold' as 'bold', fontSize: fontSizeLabel, fillColor: LIGHT_GRAY_COLOR, textColor: [0, 0, 0], cellPadding: tablePadding * 2 }
      }]);
      body.push([{
        content: item.content || '---',
        styles: { fontStyle: 'normal' as 'normal', fontSize: fontSizeNotice, fillColor: [255, 255, 255], textColor: [0, 0, 0], cellPadding: tablePadding * 2 }
      }]);
    });

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      tableWidth: contentWidth,
      theme: 'plain',
      styles: { font: 'arial' as any },
      body,
      columnStyles: { 0: { cellWidth: contentWidth } }
    });

    currentY = (doc as any).lastAutoTable.finalY;
  };

  // 6. Avisos do Município
  if (exportData['Avisos do Município']) {
    drawDynamicList("AVISOS DO MUNICÍPIO", [{
      header: exportData['Avisos do Município'].data || 'Aviso',
      content: exportData['Avisos do Município'].conteudo
    }]);
  }

  // 7. Preparos
  if (exportData['Preparos'] && Array.isArray(exportData['Preparos'])) {
    drawDynamicList("PREPARO(S) PARA O PROCEDIMENTO(S)", exportData['Preparos'].map((p: any) => ({
      header: p.titulo || 'Preparo',
      content: p.conteudo
    })));
  }

  // 8. Histórico de Observações / Movimentações
  if (ficha?.history && ficha.history.length > 0) {
    drawHeader("HISTÓRICO DE MOVIMENTAÇÕES");

    const historyHead = [["DATA / HORA", "OPERADOR / PERFIL", "STATUS / PARECER"]];
    const historyBody = ficha.history.map((h: any) => {
      const statusStr = (h.status || 'REGISTRO').toUpperCase();
      const opinionText = `${statusStr}\n${h.noteTitle ? h.noteTitle + '\n' : ''}${h.noteContent || ''}`.trim();

      return [
        `${h.date || ''}\n${h.time ? 'às ' + h.time : ''}`.trim(),
        `${h.authorRole || ''}\n${h.authorName || ''}`.trim(),
        opinionText
      ];
    });

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      tableWidth: contentWidth,
      theme: 'grid',
      head: historyHead,
      body: historyBody,
      headStyles: {
        fillColor: LIGHT_GRAY_COLOR,
        textColor: [0, 0, 0],
        fontStyle: 'bold' as 'bold',
        fontSize: fontSizeLabel,
        cellPadding: tablePadding * 2
      },
      styles: {
        font: 'arial' as any,
        fontSize: fontSizeValue,
        textColor: [0, 0, 0],
        lineColor: [220, 220, 220],
        lineWidth: 0.5,
        cellPadding: tablePadding * 2,
        valign: 'top' as 'top'
      },
      columnStyles: {
        0: { cellWidth: contentWidth * 0.18 },
        1: { cellWidth: contentWidth * 0.32 },
        2: { cellWidth: contentWidth * 0.50 }
      },
      willDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 2) {
          if (data.cell.text && data.cell.text.length > 0) {
            const firstLine = data.cell.text[0].trim();
            if (firstLine === 'PENDENTE') {
              // Limpa a linha original usando um espaço para o autoTable não desenhá-la,
              // mas manter a altura correta (evitar que o texto grude no topo)
              data.cell.text[0] = ' ';
            }
          }
        }
      },
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 2) {
          const rawRow = data.row.raw as any[];
          const rawStatus = String(rawRow[2] || '');
          if (rawStatus.startsWith('PENDENTE')) {
            const firstLine = 'PENDENTE';
            const prevFontName = doc.getFont().fontName;
            doc.setFont('arial', 'bold');
            // Amarelo escuro (Amber 600)
            doc.setTextColor(217, 119, 6);
            
            // Desenha nosso texto formatado na mesma posição original
            // Adicionado { baseline: 'top' } pois getTextPos().y retorna a posição no topo da célula
            doc.text(firstLine, data.cell.getTextPos().x, data.cell.getTextPos().y, { baseline: 'top' } as any);
            
            doc.setFont(prevFontName, 'normal');
            doc.setTextColor(0, 0, 0);
          }
        }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY;
  }

  // Outer border box around the entire master table
  doc.setDrawColor(BORDER_GRAY_COLOR[0], BORDER_GRAY_COLOR[1], BORDER_GRAY_COLOR[2]);
  doc.setLineWidth(0.5);
  doc.rect(margin, margin, contentWidth, currentY - margin);

  return doc.getNumberOfPages();
}

export const gerarFichaPDFBlob = async (ficha: any, code: string): Promise<Blob> => {
  const arialFonts = await getArialFonts();
  const getValue = createGetValue(ficha, code);

  let bestScale = 1.0;
  for (let s = 1.0; s >= 0.55; s = Math.round((s - 0.05) * 100) / 100) {
    const testDoc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    setupArial(testDoc, arialFonts);
    const pages = renderFichaDocument(testDoc, ficha, getValue, s);
    if (pages === 1) {
      bestScale = s;
      break;
    }
    bestScale = s;
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  setupArial(doc, arialFonts);
  renderFichaDocument(doc, ficha, getValue, bestScale);

  return doc.output('blob');
};

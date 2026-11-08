import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import { BpaRecordDto } from './dto/bpa.dto';

@Injectable()
export class BpaPdfService {
  async generateBpaPdf(
    records: BpaRecordDto[],
    competencia: string,
    unitInfo: { cnes: string; name: string }
  ): Promise<Buffer> {
    // 1. Agrupar atendimentos por profissional
    const profGroups: Record<string, BpaRecordDto[]> = {};
    for (const rec of records) {
      const profKey = rec.cnsProfissional || rec.cpfPaciente || 'DEFAULT';
      if (!profGroups[profKey]) profGroups[profKey] = [];
      profGroups[profKey].push(rec);
    }

    const profKeys = Object.keys(profGroups);

    return new Promise((resolve, reject) => {
      // PDFKit com margem 0 para controle milimétrico e idêntico a relatorios_e-sus_regulacao
      const doc = new PDFDocument({ margin: 0, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const itemsPerPage = 3;
      let folha = 1;

      if (profKeys.length === 0) {
        this.drawPage(doc, [], competencia, unitInfo.cnes, folha, '', '', '', unitInfo.name);
      } else {
        let isFirstPage = true;
        for (const profId of profKeys) {
          const profRecords = profGroups[profId];
          const totalProfPages = Math.ceil(profRecords.length / itemsPerPage);

          for (let page = 0; page < totalProfPages; page++) {
            if (!isFirstPage) {
              doc.addPage();
            }
            isFirstPage = false;

            const chunk = profRecords.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
            const refRec = chunk[0];

            const profNome = refRec.nomeProfissional || '';
            const profCbo = refRec.cboProfissional || '';
            const unitName = refRec.nomeEstabelecimento || unitInfo.name || 'ESTABELECIMENTO DE SAÚDE';

            this.drawPage(doc, chunk, competencia, unitInfo.cnes, folha, profId, profNome, profCbo, unitName);
            folha++;
          }
        }
      }

      doc.end();
    });
  }

  private drawPage(
    doc: typeof PDFDocument,
    records: BpaRecordDto[],
    competencia: string,
    cnes: string,
    folha: number,
    profCpfOrCns: string,
    profNome: string,
    profCbo: string,
    unitName: string
  ) {
    const W = 595.28;
    const H = 841.89;
    const margin_x = 25;
    const cw = W - 2 * margin_x;
    const blue = '#1e3b70';
    const form_height = 729;
    const padding = 16;
    const radius = 16;
    const border_height = form_height + (2 * padding);
    const margin_y = (H - border_height) / 2.0;

    const box = (x: number, y: number, w: number, h: number, label: string, value: string = '') => {
      doc.strokeColor(blue).lineWidth(0.7).rect(x, y, w, h).stroke();
      doc.fillColor(blue).font('Helvetica').fontSize(5.5);
      doc.text(label, x + 2, y + 2, { lineBreak: false });
      if (value) {
        doc.fillColor('#000').font('Helvetica-Bold').fontSize(9.5);
        doc.text(value, x + 2, y + 10, { width: w - 4, height: h - 12, ellipsis: true });
      }
    };

    const bar = (x: number, y: number, w: number, h: number, text: string) => {
      doc.rect(x, y, w, h).fillAndStroke(blue, blue);
      doc.fillColor('#fff').font('Helvetica-Bold').fontSize(8);
      doc.text(text, x, y + 3.5, { width: w, align: 'center' });
    };

    let py = margin_y + padding;

    // Header Principal com Logo e Título
    doc.strokeColor(blue).lineWidth(1.5).rect(margin_x, py, cw, 35).stroke();

    // Logotipo
    const logoPath = path.join(process.cwd(), 'assets', 'logo.png');
    const brasaoPath = path.join(process.cwd(), 'assets', 'brasao.png');

    if (fs.existsSync(brasaoPath)) {
      try {
        doc.image(brasaoPath, margin_x + 5, py + 3, { width: 40, height: 28, fit: [40, 28] });
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, margin_x + 50, py + 4, { width: 115, height: 26, fit: [115, 26] });
        }
      } catch {
        doc.fillColor(blue).font('Helvetica-Bold').fontSize(10).text('SINPeP', margin_x + 10, py + 12);
      }
    } else if (fs.existsSync(logoPath)) {
      try {
        doc.image(logoPath, margin_x + 5, py + 3, { width: 160, height: 28, fit: [160, 28] });
      } catch {
        doc.fillColor(blue).font('Helvetica-Bold').fontSize(10).text('SINPeP', margin_x + 10, py + 12);
      }
    } else {
      doc.fillColor(blue).font('Helvetica-Bold').fontSize(12).text('SINPeP SAÚDE', margin_x + 10, py + 12);
    }

    doc.strokeColor(blue).lineWidth(1).moveTo(margin_x + 175, py + 5).lineTo(margin_x + 175, py + 30).stroke();

    doc.font('Helvetica-Bold').fontSize(26).fillColor(blue).text('BPA-I', margin_x + 185, py + 7);
    const titleText = 'Boletim de Produção Ambulatorial';
    doc.fontSize(13).text(titleText, margin_x + 265, py + 9);
    const titleWidth = doc.widthOfString(titleText);
    const titleEndX = margin_x + 265 + titleWidth;

    const subtitleText = 'Dados Individualizados';
    doc.fontSize(11);
    const subtitleWidth = doc.widthOfString(subtitleText);
    doc.text(subtitleText, titleEndX - subtitleWidth, py + 22);

    py += 40;

    // Identificação do Estabelecimento de Saúde
    bar(margin_x, py, cw, 14, 'IDENTIFICAÇÃO DO ESTABELECIMENTO DE SAÚDE');
    py += 14;
    box(margin_x, py, 400, 22, 'NOME DO ESTABELECIMENTO DE SAÚDE', unitName);
    box(margin_x + 400, py, cw - 400, 22, 'CNES', cnes);

    py += 28;

    // Identificação do Profissional
    bar(margin_x, py, cw, 14, 'IDENTIFICAÇÃO DO PROFISSIONAL');
    py += 14;
    box(
      margin_x,
      py,
      220,
      22,
      'CADASTRO DE PESSOA FÍSICA (CPF) OU CARTÃO NACIONAL DE SAÚDE (CNS)',
      profCpfOrCns !== 'DEFAULT' ? profCpfOrCns : ''
    );
    box(margin_x + 220, py, cw - 220, 22, 'NOME DO PROFISSIONAL', profNome);
    py += 22;
    box(margin_x, py, 170, 22, 'CBO', profCbo);

    const cleanComp = (competencia || '').replace(/\D/g, '');
    const mesAno =
      cleanComp.length >= 6
        ? `${cleanComp.substring(4, 6)}/${cleanComp.substring(0, 4)}`
        : competencia;
    box(margin_x + 170, py, 100, 22, 'MÊS/ANO', mesAno);
    box(margin_x + 270, py, 180, 22, 'EQUIPE', '');
    box(margin_x + 450, py, cw - 450, 22, 'FOLHA', folha.toString().padStart(3, '0'));

    py += 35;

    // Exatamente 3 Atendimentos / Sequências por página
    for (let i = 0; i < 3; i++) {
      const record = records[i];

      doc.rect(margin_x, py, 80, 16).fillAndStroke(blue, blue);
      doc.fillColor('#fff').font('Helvetica-Bold').fontSize(11).text(`Sequência ${i + 1}`, margin_x + 5, py + 4);

      bar(margin_x + 80, py, 320, 16, 'IDENTIFICAÇÃO DO PACIENTE');

      // Checkbox Paciente RUA
      doc.strokeColor(blue).lineWidth(0.7).rect(margin_x + 400, py, cw - 400, 16).stroke();
      doc.fillColor(blue).font('Helvetica').fontSize(6).text('Paciente em situação de RUA?', margin_x + 405, py + 6);

      doc.text('Sim', margin_x + 490, py + 6);
      doc.rect(margin_x + 505, py + 5, 8, 8).stroke();
      if (record && record.situacaoRua) {
        doc.moveTo(margin_x + 505, py + 5).lineTo(margin_x + 513, py + 13).stroke();
        doc.moveTo(margin_x + 513, py + 5).lineTo(margin_x + 505, py + 13).stroke();
      }

      doc.text('Não', margin_x + 520, py + 6);
      doc.rect(margin_x + 535, py + 5, 8, 8).stroke();
      if (record && !record.situacaoRua) {
        doc.moveTo(margin_x + 535, py + 5).lineTo(margin_x + 543, py + 13).stroke();
        doc.moveTo(margin_x + 543, py + 5).lineTo(margin_x + 535, py + 13).stroke();
      }

      py += 16;
      box(
        margin_x,
        py,
        220,
        22,
        'CADASTRO DE PESSOA FÍSICA (CPF) OU CNS',
        record ? (record.semCpf ? '' : (record.cpfPaciente || record.cnsPaciente || '')) : ''
      );
      box(margin_x + 220, py, cw - 220, 22, 'NOME DO PACIENTE', record?.nomePaciente || '');

      py += 22;
      box(margin_x, py, 60, 24, 'SEXO');
      doc.fillColor(blue).font('Helvetica').fontSize(6).text('Masc.', margin_x + 3, py + 13);
      doc.rect(margin_x + 22, py + 12, 8, 8).stroke();
      if (record?.sexo === 'M') {
        doc.moveTo(margin_x + 22, py + 12).lineTo(margin_x + 30, py + 20).stroke();
        doc.moveTo(margin_x + 30, py + 12).lineTo(margin_x + 22, py + 20).stroke();
      }

      doc.text('Fem.', margin_x + 34, py + 13);
      doc.rect(margin_x + 49, py + 12, 8, 8).stroke();
      if (record?.sexo === 'F') {
        doc.moveTo(margin_x + 49, py + 12).lineTo(margin_x + 57, py + 20).stroke();
        doc.moveTo(margin_x + 57, py + 12).lineTo(margin_x + 49, py + 20).stroke();
      }

      box(margin_x + 60, py, 80, 24, 'DATA DE NASCIMENTO', this.formatDate(record?.dataNascimento));
      box(margin_x + 140, py, 80, 24, 'NACIONALIDADE', record ? (record.nacionalidade || '010') : '');
      box(margin_x + 220, py, 70, 24, 'RAÇA/COR', record ? (record.racaCor || '03') : '');
      box(margin_x + 290, py, 70, 24, 'ETNIA', record?.etnia || '');
      box(margin_x + 360, py, 90, 24, 'CEP', record?.cep || '');
      box(margin_x + 450, py, cw - 450, 24, 'CÓD. IBGE MUNICÍPIO', record?.ibge || '');

      py += 24;
      box(margin_x, py, 100, 22, 'COD LOGRADOURO', record ? (record.logradouro || '081') : '');
      box(margin_x + 100, py, 250, 22, 'ENDEREÇO', record?.endereco || '');
      box(margin_x + 350, py, 60, 22, 'NÚMERO', record?.numero || '');
      box(margin_x + 410, py, cw - 410, 22, 'COMPLEMENTO', record?.complemento || '');

      py += 22;
      box(margin_x, py, 150, 22, 'BAIRRO', record?.bairro || '');

      let ddd = '';
      let tel = '';
      if (record?.telefone) {
        const cleanTel = record.telefone.replace(/\D/g, '');
        if (cleanTel.length >= 10) {
          ddd = cleanTel.substring(0, 2);
          let num = cleanTel.substring(2);
          if (num.length === 9) num = num.substring(1);
          tel = num;
        }
      }

      box(margin_x + 150, py, 35, 22, 'DDD', ddd);
      box(margin_x + 185, py, 115, 22, 'TELEFONE / Nº TELEFONE', tel);
      box(margin_x + 300, py, cw - 300, 22, 'E-MAIL', record?.email || '');

      py += 22;
      bar(margin_x, py, cw, 14, 'PROCEDIMENTO REALIZADO');

      py += 14;
      box(margin_x, py, 90, 22, 'DATA DO ATENDIMENTO', this.formatDate(record?.dataAtendimento));
      box(
        margin_x + 90,
        py,
        280,
        22,
        'CÓDIGO DO PROCEDIMENTO',
        record ? `${record.procedimento || ''} ${record.procedimentoNome ? `- ${record.procedimentoNome}` : ''}` : ''
      );
      box(margin_x + 370, py, 40, 22, 'QTDE', record ? '1' : '');
      box(margin_x + 410, py, cw - 410, 22, 'CNPJ', '');

      py += 22;
      box(margin_x, py, 50, 22, 'SERVIÇO', '');
      box(margin_x + 50, py, 50, 22, 'CLASS', '');
      box(margin_x + 100, py, 100, 22, 'CID', record?.cid || '');
      box(margin_x + 200, py, 160, 22, 'CARÁTER DE ATENDIMENTO', record ? (record.caraterAtendimento || '01') : '');
      box(margin_x + 360, py, cw - 360, 22, 'Nº DA AUTORIZAÇÃO', '');

      py += 30;
    }

    py += 10;
    doc.strokeColor(blue).lineWidth(0.7);
    doc.rect(margin_x, py, 260, 50).stroke();
    doc.rect(margin_x + 285, py, cw - 285, 50).stroke();

    doc.fillColor(blue).font('Helvetica').fontSize(7);
    doc.text('RESPONSÁVEL PELO ESTABELECIMENTO DE SAÚDE', margin_x + 5, py + 5);
    doc.text('DATA: ______/______/______', margin_x + 5, py + 20);
    doc.text('CARIMBO', margin_x + 5, py + 35);
    doc.text('RUBRICA', margin_x + 130, py + 35);

    doc.text('GESTOR MUNICIPAL / ESTADUAL', margin_x + 290, py + 5);
    doc.text('DATA: ______/______/______', margin_x + 290, py + 20);
    doc.text('CARIMBO', margin_x + 290, py + 35);
    doc.text('RUBRICA', margin_x + 450, py + 35);

    doc.strokeColor(blue).lineWidth(2);
    doc.roundedRect(margin_x - padding, margin_y, cw + padding * 2, border_height, radius).stroke();
  }

  private formatDate(dateStr?: string) {
    if (!dateStr) return '';
    const clean = dateStr.replace(/\D/g, '');
    if (clean.length === 8) {
      if (dateStr.includes('-')) {
        const parts = dateStr.split('-');
        if (parts[0].length === 4) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return `${clean.substring(6, 8)}/${clean.substring(4, 6)}/${clean.substring(0, 4)}`;
    }
    return dateStr;
  }
}

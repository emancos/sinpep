import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, FileText } from 'lucide-react';

export interface ApacRecord {
  recordDate?: string;
  observation?: string;
  cid10?: string;
  cid10Secondary?: string;
  cid10AssociatedCauses?: string;
  selectedCids?: string[];
  requestedExams?: string[];
  examsJustification?: string;
  doctor?: any;
}

export interface ApacReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient?: any;
  record?: ApacRecord | null;
  currentDoctor?: any;
  unitInfo?: {
    name?: string;
    cnes?: string;
    city?: string;
    state?: string;
    ibgeCode?: string;
    address?: string;
    phone?: string;
  };
}

// Células individuais para dígitos (CNES, CNS, CEP, Código Procedimento, CPF)
const DigitBoxes: React.FC<{ length: number; value?: string; className?: string }> = ({
  length,
  value = '',
  className = '',
}) => {
  const clean = (value || '').replace(/[^a-zA-Z0-9]/g, '');
  const digits = Array.from({ length }, (_, i) => clean[i] || '');

  return (
    <div className={`inline-flex border-t border-b border-l border-black h-[18px] bg-white ${className}`}>
      {digits.map((d, i) => (
        <span
          key={i}
          className="w-3.5 h-[16px] border-r border-black flex items-center justify-center font-mono font-bold text-[10px] text-black leading-none select-text"
        >
          {d}
        </span>
      ))}
    </div>
  );
};

// Caixa de data com barras separadoras
const DateDisplay: React.FC<{ value?: string; dateObj?: Date }> = ({ value, dateObj }) => {
  let d = '';
  let m = '';
  let y = '';

  if (dateObj && !isNaN(dateObj.getTime())) {
    d = String(dateObj.getDate()).padStart(2, '0');
    m = String(dateObj.getMonth() + 1).padStart(2, '0');
    y = String(dateObj.getFullYear());
  } else if (value) {
    const clean = value.replace(/\D/g, '');
    d = clean.slice(0, 2);
    m = clean.slice(2, 4);
    y = clean.slice(4, 8);
  }

  return (
    <div className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-black h-[18px]">
      <span className="w-5 text-center">{d || '__'}</span>
      <span>/</span>
      <span className="w-5 text-center">{m || '__'}</span>
      <span>/</span>
      <span className="w-8 text-center">{y || '____'}</span>
    </div>
  );
};

// Logo oficial do SUS com Ministério da Saúde
const SusHeaderLogo: React.FC = () => (
  <div className="flex items-center gap-1.5 border border-black p-1 bg-white">
    <div className="flex items-center gap-1">
      {/* Símbolo Cruz do SUS */}
      <svg viewBox="0 0 45 45" className="w-8 h-8" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M17 2 H28 V17 H43 V28 H28 V43 H17 V28 H2 V17 H17 Z" fill="#000000" />
        <path d="M19 19 H26 V26 H19 Z" fill="#FFFFFF" />
      </svg>
      <span className="font-sans font-black text-lg tracking-tighter text-black">SUS</span>
    </div>
    <div className="h-7 w-[1px] bg-black mx-0.5"></div>
    <div className="flex gap-2 text-[7px] font-bold uppercase leading-tight text-black">
      <div>
        <div>Sistema</div>
        <div>Único de</div>
        <div>Saúde</div>
      </div>
      <div>
        <div>Ministério</div>
        <div>da</div>
        <div>Saúde</div>
      </div>
    </div>
  </div>
);

// Parser de string de exame para código e nome
function parseExamItem(examStr?: string) {
  if (!examStr) return { code: '', name: '', qty: 1 };
  const parts = examStr.split(' - ');
  if (parts.length >= 2) {
    const code = parts[0].trim();
    const name = parts.slice(1).join(' - ').trim();
    return { code, name, qty: 1 };
  }
  return { code: '', name: examStr.trim(), qty: 1 };
}

export const ApacReportModal: React.FC<ApacReportModalProps> = ({
  isOpen,
  onClose,
  patient,
  record,
  currentDoctor,
  unitInfo,
}) => {
  if (!isOpen || !record) return null;

  // Lista de exames/procedimentos solicitados
  const rawExams = useMemo(() => {
    return (record.requestedExams || []).filter((e) => e && e.trim().length > 0);
  }, [record.requestedExams]);

  // Procedimento principal selecionado
  const [selectedMainExamIdx, setSelectedMainExamIdx] = useState(0);

  // Campos complementares do formulário
  const motherName = patient?.motherName || '';
  const responsibleName = patient?.responsibleName || '';
  const patientRace = patient?.race || '';
  const executingUnitName = unitInfo?.name || patient?.healthCenter?.name || '';
  const executingUnitCnes = unitInfo?.cnes || patient?.healthCenter?.cnes || '';
  const authorizerOrgCode = 'SMS';

  // Procedimento Principal
  const mainExam = useMemo(() => {
    const chosen = rawExams[selectedMainExamIdx] || rawExams[0];
    return parseExamItem(chosen);
  }, [rawExams, selectedMainExamIdx]);

  // Procedimentos Secundários (até 5 linhas: 21 a 35)
  const secondaryExams = useMemo(() => {
    const secondaries = rawExams.filter((_, idx) => idx !== selectedMainExamIdx);
    const parsed = secondaries.map((e) => parseExamItem(e));
    while (parsed.length < 5) {
      parsed.push({ code: '', name: '', qty: 1 });
    }
    return parsed.slice(0, 5);
  }, [rawExams, selectedMainExamIdx]);

  // Dados do Paciente
  const patientName = patient?.name || '';
  const patientRecordNumber = patient?.id ? patient.id.slice(0, 8).toUpperCase() : '';
  const patientCns = patient?.cns || patient?.susCard || '';
  const patientBirthDate = patient?.birthDate ? new Date(patient.birthDate) : undefined;
  const patientGender = (patient?.gender || '').toUpperCase();
  const patientPhone = patient?.phones?.[0]?.phoneNumber?.replace(/\D/g, '') || '';
  const phoneDdd = patientPhone.length >= 10 ? patientPhone.slice(0, 2) : '';
  const phoneNumber = patientPhone.length >= 10 ? patientPhone.slice(2) : patientPhone;
  const patientAddress = patient?.address || '';

  // Estabelecimento Solicitante
  const solicitingUnitName = unitInfo?.name || patient?.healthCenter?.name || 'CENTRO DE SAÚDE';
  const solicitingUnitCnes = unitInfo?.cnes || patient?.healthCenter?.cnes || '';
  const city = unitInfo?.city || patient?.healthCenter?.noMunicipio || '';
  const ibgeCode = unitInfo?.ibgeCode || patient?.healthCenter?.coMunicipioIbge || '';
  const state = unitInfo?.state || patient?.healthCenter?.sgUf || 'CE';
  const cep = (unitInfo as any)?.coCep || patient?.healthCenter?.coCep || '';

  // Data do atendimento
  const recordDateObj = record.recordDate ? new Date(record.recordDate) : new Date();

  // Médico Solicitante
  const doctorName =
    record.doctor?.name ||
    record.doctor?.user?.name ||
    currentDoctor?.user?.name ||
    currentDoctor?.name ||
    '';

  const docData = record.doctor?.doctors?.[0] || record.doctor || currentDoctor;
  const doctorCrm = docData?.crm
    ? `${docData.crm}${docData.crmState ? '/' + docData.crmState : ''}`
    : '';
  const doctorCns = docData?.cns || '';
  const doctorCpf = docData?.cpf || '';

  // CIDs
  const primaryCid = record.cid10 || record.selectedCids?.[0] || '';
  const secondaryCid = record.cid10Secondary || record.selectedCids?.[1] || '';
  const associatedCid = record.cid10AssociatedCauses || record.selectedCids?.[2] || '';

  // Justificativa e observações
  const observations = record.examsJustification || record.observation || '';

  const handlePrint = () => {
    window.print();
  };

  const modalContent = (
    <div
      id="apac-print-modal-portal"
      className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-start overflow-y-auto p-2 sm:p-6 print:p-0 print:static print:bg-white"
    >
      {/* BARRA SUPERIOR DE AÇÕES E AJUSTES (OCULTA NA IMPRESSÃO) */}
      <div className="no-print w-full max-w-[210mm] bg-white dark:bg-slate-800 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 p-4 mb-4 flex flex-col gap-3 sticky top-2 z-10">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-md">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                Laudo para Solicitação/Autorização de Procedimento Ambulatorial (APAC)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Formulário Oficial do Sistema Único de Saúde (SUS) • Folha 1/2
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-sm active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Laudo APAC</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CONTROLES RÁPIDOS SE HOUVER MÚLTIPLOS EXAMES */}
        {rawExams.length > 1 && (
          <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded border border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-3 text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300">
              Definir Procedimento Principal:
            </span>
            <select
              value={selectedMainExamIdx}
              onChange={(e) => setSelectedMainExamIdx(parseInt(e.target.value, 10))}
              className="flex-1 px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
            >
              {rawExams.map((exam, i) => (
                <option key={i} value={i}>
                  {i === 0 ? 'Item 1 (Principal): ' : `Item ${i + 1}: `} {exam}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* DOCUMENTO LAUDO APAC A4 (IDÊNTICO AO DOCUMENTO OFICIAL SUS) */}
      <div
        id="apac-print-document"
        className="w-full max-w-[210mm] min-h-[297mm] h-[297mm] max-h-[297mm] bg-white text-black shadow-2xl p-[6mm] sm:p-[8mm] rounded-sm border border-black flex flex-col justify-between box-border overflow-hidden select-text text-black font-sans leading-tight"
        style={{ color: '#000000' }}
      >
        {/* CABEÇALHO */}
        <div className="border-2 border-black mb-1">
          <div className="flex items-stretch justify-between p-1 gap-2">
            <div className="shrink-0 flex items-center">
              <SusHeaderLogo />
            </div>

            <div className="flex-1 flex flex-col justify-center text-center px-2">
              <h1 className="font-black italic text-xs sm:text-sm tracking-tight uppercase leading-tight">
                LAUDO PARA SOLICITAÇÃO/AUTORIZAÇÃO DE PROCEDIMENTO AMBULATORIAL
              </h1>
            </div>

            <div className="shrink-0 text-right pr-2 pt-1">
              <span className="font-bold italic text-xs">fls. 1/2</span>
            </div>
          </div>
        </div>

        {/* 1. IDENTIFICAÇÃO DO ESTABELECIMENTO DE SAÚDE (SOLICITANTE) */}
        <div className="border border-black mb-1">
          <div className="bg-black text-white text-[8.5px] font-bold py-0.5 text-center uppercase tracking-wide">
            IDENTIFICAÇÃO DO ESTABELECIMENTO DE SAÚDE (SOLICITANTE)
          </div>
          <div className="flex divide-x divide-black border-t border-black">
            <div className="flex-1 p-1">
              <div className="text-[7px] font-bold text-slate-800 uppercase">
                1 - NOME DO ESTABELECIMENTO DE SAÚDE SOLICITANTE
              </div>
              <div className="text-[10px] font-bold uppercase truncate mt-0.5">
                {solicitingUnitName}
              </div>
            </div>
            <div className="w-36 p-1 flex flex-col justify-between">
              <div className="text-[7px] font-bold text-slate-800 uppercase">2 - CNES</div>
              <div className="mt-0.5">
                <DigitBoxes length={7} value={solicitingUnitCnes} />
              </div>
            </div>
          </div>
        </div>

        {/* 2. IDENTIFICAÇÃO DO PACIENTE */}
        <div className="border border-black mb-1">
          <div className="bg-black text-white text-[8.5px] font-bold py-0.5 text-center uppercase tracking-wide">
            IDENTIFICAÇÃO DO PACIENTE
          </div>

          {/* Linha 1: Nome e Prontuário */}
          <div className="flex divide-x divide-black border-t border-black">
            <div className="flex-1 p-1">
              <div className="text-[7px] font-bold text-slate-800 uppercase">3 - NOME DO PACIENTE</div>
              <div className="text-[10px] font-bold uppercase truncate mt-0.5">{patientName}</div>
            </div>
            <div className="w-40 p-1">
              <div className="text-[7px] font-bold text-slate-800 uppercase">4 - Nº DO PRONTUÁRIO</div>
              <div className="text-[10px] font-bold font-mono mt-0.5">{patientRecordNumber}</div>
            </div>
          </div>

          {/* Linha 2: CNS, Nascimento, Sexo, Raça */}
          <div className="flex divide-x divide-black border-t border-black">
            <div className="w-56 p-1">
              <div className="text-[7px] font-bold text-slate-800 uppercase">
                5 - CARTÃO NACIONAL DE SAÚDE (CNS)
              </div>
              <div className="mt-0.5">
                <DigitBoxes length={15} value={patientCns} />
              </div>
            </div>

            <div className="w-28 p-1">
              <div className="text-[7px] font-bold text-slate-800 uppercase">6 - DATA DE NASCIMENTO</div>
              <div className="mt-0.5">
                <DateDisplay dateObj={patientBirthDate} />
              </div>
            </div>

            <div className="w-24 p-1">
              <div className="text-[7px] font-bold text-slate-800 uppercase mb-0.5">7 - SEXO</div>
              <div className="flex items-center gap-2 text-[8px] font-bold">
                <span className="flex items-center gap-0.5">
                  Masc. <span className="inline-block w-3 h-3 border border-black text-center leading-3">{patientGender.startsWith('M') ? 'X' : ''}</span>
                </span>
                <span className="flex items-center gap-0.5">
                  Fem. <span className="inline-block w-3 h-3 border border-black text-center leading-3">{patientGender.startsWith('F') ? 'X' : ''}</span>
                </span>
              </div>
            </div>

            <div className="flex-1 p-1">
              <div className="text-[7px] font-bold text-slate-800 uppercase">8 - RAÇA/COR</div>
              <div className="text-[9px] font-medium uppercase mt-0.5">{patientRace}</div>
            </div>
          </div>

          {/* Linha 3: Mãe e Telefone */}
          <div className="flex divide-x divide-black border-t border-black">
            <div className="flex-1 p-1">
              <div className="text-[7px] font-bold text-slate-800 uppercase">9 - NOME DA MÃE</div>
              <div className="text-[9.5px] font-bold uppercase truncate mt-0.5">{motherName}</div>
            </div>
            <div className="w-48 p-1">
              <div className="text-[7px] font-bold text-slate-800 uppercase">10 - TELEFONE DE CONTATO</div>
              <div className="flex items-center gap-1.5 mt-0.5 text-[9px] font-mono font-bold">
                <span className="border border-black px-1 py-0.2">{phoneDdd || 'DDD'}</span>
                <span className="border border-black px-2 py-0.2 flex-1">{phoneNumber || 'Nº TELEFONE'}</span>
              </div>
            </div>
          </div>

          {/* Linha 4: Responsável e Telefone */}
          <div className="flex divide-x divide-black border-t border-black">
            <div className="flex-1 p-1">
              <div className="text-[7px] font-bold text-slate-800 uppercase">11 - NOME DO RESPONSÁVEL</div>
              <div className="text-[9.5px] font-bold uppercase truncate mt-0.5">{responsibleName}</div>
            </div>
            <div className="w-48 p-1">
              <div className="text-[7px] font-bold text-slate-800 uppercase">12 - TELEFONE DE CONTATO</div>
              <div className="flex items-center gap-1.5 mt-0.5 text-[9px] font-mono text-slate-400">
                <span className="border border-black px-1 py-0.2">DDD</span>
                <span className="border border-black px-2 py-0.2 flex-1">Nº DO TELEFONE</span>
              </div>
            </div>
          </div>

          {/* Linha 5: Endereço */}
          <div className="border-t border-black p-1">
            <div className="text-[7px] font-bold text-slate-800 uppercase">
              13 - ENDEREÇO (RUA, Nº, BAIRRO)
            </div>
            <div className="text-[9.5px] font-medium uppercase truncate mt-0.5">
              {patientAddress}
            </div>
          </div>

          {/* Linha 6: Município, IBGE, UF, CEP */}
          <div className="flex divide-x divide-black border-t border-black">
            <div className="flex-1 p-1">
              <div className="text-[7px] font-bold text-slate-800 uppercase">14 - MUNICÍPIO DE RESIDÊNCIA</div>
              <div className="text-[9.5px] font-bold uppercase truncate mt-0.5">{city}</div>
            </div>
            <div className="w-28 p-1">
              <div className="text-[7px] font-bold text-slate-800 uppercase">15 - CÓD. IBGE MUNICÍPIO</div>
              <div className="text-[9.5px] font-mono font-bold mt-0.5">{ibgeCode}</div>
            </div>
            <div className="w-12 p-1 text-center">
              <div className="text-[7px] font-bold text-slate-800 uppercase">16 - UF</div>
              <div className="text-[9.5px] font-bold uppercase mt-0.5">{state}</div>
            </div>
            <div className="w-36 p-1">
              <div className="text-[7px] font-bold text-slate-800 uppercase">17 - CEP</div>
              <div className="mt-0.5">
                <DigitBoxes length={8} value={cep} />
              </div>
            </div>
          </div>
        </div>

        {/* 3. PROCEDIMENTO SOLICITADO (PRINCIPAL) */}
        <div className="border border-black mb-1">
          <div className="bg-black text-white text-[8.5px] font-bold py-0.5 text-center uppercase tracking-wide">
            PROCEDIMENTO SOLICITADO
          </div>
          <div className="flex divide-x divide-black border-t border-black">
            <div className="w-48 p-1">
              <div className="text-[7px] font-bold text-slate-800 uppercase">
                18 - CÓDIGO DO PROCEDIMENTO PRINCIPAL
              </div>
              <div className="mt-0.5">
                <DigitBoxes length={10} value={mainExam.code} />
              </div>
            </div>
            <div className="flex-1 p-1">
              <div className="text-[7px] font-bold text-slate-800 uppercase">
                19 - NOME DO PROCEDIMENTO PRINCIPAL
              </div>
              <div className="text-[9.5px] font-bold uppercase truncate mt-0.5">
                {mainExam.name}
              </div>
            </div>
            <div className="w-14 p-1 text-center">
              <div className="text-[7px] font-bold text-slate-800 uppercase">20 - QTDE.</div>
              <div className="text-[10px] font-bold font-mono mt-0.5">
                {mainExam.code ? mainExam.qty : ''}
              </div>
            </div>
          </div>
        </div>

        {/* 4. PROCEDIMENTO(S) SECUNDÁRIO(S) - 5 LINHAS */}
        <div className="border border-black mb-1">
          <div className="bg-black text-white text-[8.5px] font-bold py-0.5 text-center uppercase tracking-wide">
            PROCEDIMENTO(S) SECUNDÁRIO(S)
          </div>

          {[
            { cCode: '21', cName: '22', cQty: '23' },
            { cCode: '24', cName: '25', cQty: '26' },
            { cCode: '27', cName: '28', cQty: '29' },
            { cCode: '30', cName: '31', cQty: '32' },
            { cCode: '33', cName: '34', cQty: '35' },
          ].map((item, idx) => {
            const sec = secondaryExams[idx] || { code: '', name: '', qty: '' };
            return (
              <div key={idx} className="flex divide-x divide-black border-t border-black">
                <div className="w-48 p-0.5 px-1">
                  <div className="text-[6.5px] font-bold text-slate-800 uppercase">
                    {item.cCode} - CÓDIGO DO PROCEDIMENTO SECUNDÁRIO
                  </div>
                  <div className="mt-0.5">
                    <DigitBoxes length={10} value={sec.code} />
                  </div>
                </div>
                <div className="flex-1 p-0.5 px-1">
                  <div className="text-[6.5px] font-bold text-slate-800 uppercase">
                    {item.cName} - NOME DO PROCEDIMENTO SECUNDÁRIO
                  </div>
                  <div className="text-[9px] font-semibold uppercase truncate mt-0.5">
                    {sec.name}
                  </div>
                </div>
                <div className="w-14 p-0.5 px-1 text-center">
                  <div className="text-[6.5px] font-bold text-slate-800 uppercase">
                    {item.cQty} - QTDE.
                  </div>
                  <div className="text-[9.5px] font-bold font-mono mt-0.5">
                    {sec.code ? sec.qty : ''}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 5. JUSTIFICATIVA DO(S) PROCEDIMENTO(S) SOLICITADO(S) */}
        <div className="border border-black mb-1 flex-1 flex flex-col justify-between">
          <div>
            <div className="bg-black text-white text-[8.5px] font-bold py-0.5 text-center uppercase tracking-wide">
              JUSTIFICATIVA DO(S) PROCEDIMENTO(S) SOLICITADO(S)
            </div>

            {/* Linha CIDs */}
            <div className="flex divide-x divide-black border-t border-black">
              <div className="flex-1 p-1">
                <div className="text-[7px] font-bold text-slate-800 uppercase">
                  36 - DESCRIÇÃO DO DIAGNÓSTICO
                </div>
                <div className="text-[9.5px] font-bold uppercase truncate mt-0.5">
                  {primaryCid ? `DIAGNÓSTICO CLÍNICO ASSOCIADO AO CID-10 (${primaryCid})` : ''}
                </div>
              </div>
              <div className="w-24 p-1 text-center">
                <div className="text-[7px] font-bold text-slate-800 uppercase">37 - CID10 PRINCIPAL</div>
                <div className="text-[10px] font-mono font-black mt-0.5">{primaryCid}</div>
              </div>
              <div className="w-24 p-1 text-center">
                <div className="text-[7px] font-bold text-slate-800 uppercase">38 - CID10 SECUNDÁRIO</div>
                <div className="text-[10px] font-mono font-bold mt-0.5">{secondaryCid}</div>
              </div>
              <div className="w-32 p-1 text-center">
                <div className="text-[7px] font-bold text-slate-800 uppercase">39 - CID10 CAUSAS ASSOCIADAS</div>
                <div className="text-[10px] font-mono font-bold mt-0.5">{associatedCid}</div>
              </div>
            </div>
          </div>

          {/* Área de Observações / Justificativa Clínica */}
          <div className="border-t border-black p-1 flex-1 flex flex-col">
            <div className="text-[7px] font-bold text-slate-800 uppercase mb-0.5">
              40 - OBSERVAÇÕES
            </div>
            <div className="text-[9px] text-slate-900 leading-tight uppercase font-medium whitespace-pre-wrap flex-1 min-h-[40px] select-text">
              {observations}
            </div>
          </div>
        </div>

        {/* 6. SOLICITAÇÃO */}
        <div className="border border-black mb-1">
          <div className="bg-black text-white text-[8.5px] font-bold py-0.5 text-center uppercase tracking-wide">
            SOLICITAÇÃO
          </div>

          <div className="flex divide-x divide-black border-t border-black">
            {/* Lado Esquerdo */}
            <div className="flex-1 flex flex-col divide-y divide-black">
              <div className="flex divide-x divide-black">
                <div className="flex-1 p-1">
                  <div className="text-[7px] font-bold text-slate-800 uppercase">
                    41 - NOME DO PROFISSIONAL SOLICITANTE
                  </div>
                  <div className="text-[9.5px] font-bold uppercase truncate mt-0.5">
                    {doctorName ? `DR(A). ${doctorName}` : ''}
                  </div>
                </div>
                <div className="w-32 p-1">
                  <div className="text-[7px] font-bold text-slate-800 uppercase">
                    42 - DATA DA SOLICITAÇÃO
                  </div>
                  <div className="mt-0.5">
                    <DateDisplay dateObj={recordDateObj} />
                  </div>
                </div>
              </div>

              <div className="flex divide-x divide-black">
                <div className="w-32 p-1">
                  <div className="text-[7px] font-bold text-slate-800 uppercase mb-0.5">
                    43 - DOCUMENTO
                  </div>
                  <div className="flex items-center gap-2 text-[8px] font-bold">
                    <span>( {doctorCns ? 'X' : ' '} ) CNS</span>
                    <span>( {!doctorCns && doctorCpf ? 'X' : ' '} ) CPF</span>
                  </div>
                </div>
                <div className="flex-1 p-1">
                  <div className="text-[7px] font-bold text-slate-800 uppercase">
                    44 - Nº DOCUMENTO (CNS/CPF) DO PROFISSIONAL SOLICITANTE
                  </div>
                  <div className="mt-0.5">
                    <DigitBoxes length={15} value={doctorCns || doctorCpf} />
                  </div>
                </div>
              </div>
            </div>

            {/* Lado Direito: Assinatura */}
            <div className="w-56 p-1 flex flex-col justify-between text-center">
              <div className="text-[7px] font-bold text-slate-800 uppercase">
                45 - ASSINATURA E CARIMBO (Nº REGISTRO DO CONSELHO)
              </div>
              <div className="pt-6">
                <div className="border-t border-black mx-4"></div>
                <div className="text-[8.5px] font-bold font-mono mt-0.5">
                  {doctorCrm ? `CRM: ${doctorCrm}` : ''}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 7. AUTORIZAÇÃO */}
        <div className="border border-black mb-1">
          <div className="bg-black text-white text-[8.5px] font-bold py-0.5 text-center uppercase tracking-wide">
            AUTORIZAÇÃO
          </div>

          <div className="flex divide-x divide-black border-t border-black">
            <div className="flex-1 flex flex-col divide-y divide-black">
              {/* Linha 1 */}
              <div className="flex divide-x divide-black">
                <div className="flex-1 p-1">
                  <div className="text-[7px] font-bold text-slate-800 uppercase">
                    46 - NOME DO PROFISSIONAL AUTORIZADOR
                  </div>
                  <div className="text-[9px] font-bold uppercase mt-0.5 h-3"></div>
                </div>
                <div className="w-36 p-1">
                  <div className="text-[7px] font-bold text-slate-800 uppercase">
                    47 - CÓD. ÓRGÃO EMISSOR
                  </div>
                  <div className="text-[9px] font-bold uppercase mt-0.5 font-mono">{authorizerOrgCode}</div>
                </div>
              </div>

              {/* Linha 2 */}
              <div className="flex divide-x divide-black">
                <div className="w-28 p-1">
                  <div className="text-[7px] font-bold text-slate-800 uppercase mb-0.5">
                    48 - DOCUMENTO
                  </div>
                  <div className="flex items-center gap-2 text-[8px] font-bold">
                    <span>( ) CNS</span>
                    <span>( ) CPF</span>
                  </div>
                </div>
                <div className="flex-1 p-1">
                  <div className="text-[7px] font-bold text-slate-800 uppercase">
                    49 - Nº DOCUMENTO (CNS/CPF) DO PROFISSIONAL AUTORIZADOR
                  </div>
                  <div className="mt-0.5">
                    <DigitBoxes length={15} value="" />
                  </div>
                </div>
              </div>

              {/* Linha 3: Data e Assinatura */}
              <div className="flex divide-x divide-black">
                <div className="w-36 p-1">
                  <div className="text-[7px] font-bold text-slate-800 uppercase">
                    50 - DATA DA AUTORIZAÇÃO
                  </div>
                  <div className="mt-0.5">
                    <DateDisplay />
                  </div>
                </div>
                <div className="flex-1 p-1 flex flex-col justify-between text-center">
                  <div className="text-[7px] font-bold text-slate-800 uppercase">
                    51 - ASSINATURA E CARIMBO (Nº REGISTRO DO CONSELHO)
                  </div>
                  <div className="pt-4">
                    <div className="border-t border-black mx-4"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Coluna da Direita: Nº APAC e Validade */}
            <div className="w-56 flex flex-col divide-y divide-black">
              <div className="p-1 flex-1">
                <div className="text-[7px] font-bold text-slate-800 uppercase">
                  52 - Nº DA AUTORIZAÇÃO (APAC)
                </div>
                <div className="text-[10px] font-mono font-bold mt-1 h-5"></div>
              </div>
              <div className="p-1">
                <div className="text-[7px] font-bold text-slate-800 uppercase">
                  53 - PERÍODO DE VALIDADE DA APAC
                </div>
                <div className="flex items-center gap-1 font-mono text-[9px] mt-0.5">
                  <span>___/___/____</span>
                  <span>a</span>
                  <span>___/___/____</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 8. IDENTIFICAÇÃO DO ESTABELECIMENTO DE SAÚDE (EXECUTANTE) */}
        <div className="border border-black">
          <div className="bg-black text-white text-[8.5px] font-bold py-0.5 text-center uppercase tracking-wide">
            IDENTIFICAÇÃO DO ESTABELECIMENTO DE SAÚDE (EXECUTANTE)
          </div>
          <div className="flex divide-x divide-black border-t border-black">
            <div className="flex-1 p-1">
              <div className="text-[7px] font-bold text-slate-800 uppercase">
                54 - NOME FANTASIA DO ESTABELECIMENTO DE SAÚDE EXECUTANTE
              </div>
              <div className="text-[9.5px] font-bold uppercase truncate mt-0.5">
                {executingUnitName}
              </div>
            </div>
            <div className="w-36 p-1 flex flex-col justify-between">
              <div className="text-[7px] font-bold text-slate-800 uppercase">55 - CNES</div>
              <div className="mt-0.5">
                <DigitBoxes length={7} value={executingUnitCnes} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, Activity, Clock, User, Users } from 'lucide-react';
import { resolveExecutingUnit } from '../utils/executingUnit';

export interface MedicalCertificateRecord {
  recordDate?: string;
  cid10?: string;
  cid10Secondary?: string;
  cid10AssociatedCauses?: string;
  selectedCids?: string[];
  executingUnitName?: string;
  executingUnitCnes?: string;
  doctor?: any;
}

export interface MedicalCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDocType?: 'atestado' | 'declaracao';
  patient?: any;
  record?: MedicalCertificateRecord | null;
  currentDoctor?: any;
  executingUnit?: {
    name?: string;
    cnes?: string;
  };
  unitInfo?: {
    name?: string;
    cnes?: string;
    city?: string;
    state?: string;
    address?: string;
  };
}

// Conversor simples de números para extenso (1 a 90 dias)
const numberToWordsPtBr = (n: number): string => {
  const units = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  const teens = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const tens = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];

  if (n === 0) return 'zero';
  if (n < 10) return units[n];
  if (n >= 10 && n < 20) return teens[n - 10];
  if (n < 100) {
    const tensDigit = Math.floor(n / 10);
    const unitDigit = n % 10;
    return unitDigit === 0 ? tens[tensDigit] : `${tens[tensDigit]} e ${units[unitDigit]}`;
  }
  return String(n);
};

// Formatação de CPF: 000.000.000-00
const formatCpf = (val: string): string => {
  const clean = val.replace(/\D/g, '').slice(0, 11);
  if (clean.length <= 3) return clean;
  if (clean.length <= 6) return `${clean.slice(0, 3)}.${clean.slice(3)}`;
  if (clean.length <= 9) return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6)}`;
  return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`;
};

export const MedicalCertificateModal: React.FC<MedicalCertificateModalProps> = ({
  isOpen,
  onClose,
  initialDocType = 'atestado',
  patient,
  record,
  currentDoctor,
  executingUnit,
  unitInfo,
}) => {
  const [docType, setDocType] = useState<'atestado' | 'declaracao'>(initialDocType);
  const [beneficiary, setBeneficiary] = useState<'paciente' | 'acompanhante'>('paciente');

  // Dados do acompanhante
  const [companionName, setCompanionName] = useState('');
  const [companionCpf, setCompanionCpf] = useState('');

  // Dados do atestado
  const [days, setDays] = useState<number>(1);
  const [includeCid, setIncludeCid] = useState(true);
  const [medicalNotes, setMedicalNotes] = useState('');

  // Dados da declaração de comparecimento
  const [periodMode, setPeriodMode] = useState<'horario' | 'turno'>('horario');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('11:30');
  const [shift, setShift] = useState<'Manhã' | 'Tarde' | 'Noite' | 'Integral'>('Manhã');

  useEffect(() => {
    setDocType(initialDocType);
  }, [initialDocType, isOpen]);

  // Se o record tiver data, inicializar horários aproximados
  useEffect(() => {
    if (record?.recordDate) {
      const d = new Date(record.recordDate);
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      setStartTime(`${h}:${m}`);

      const endD = new Date(d.getTime() + 60 * 60 * 1000); // +1 hora
      const endH = String(endD.getHours()).padStart(2, '0');
      const endM = String(endD.getMinutes()).padStart(2, '0');
      setEndTime(`${endH}:${endM}`);
    }
  }, [record?.recordDate]);

  if (!isOpen || !record) return null;

  // Extração de dados
  const patientName = patient?.name || 'Não identificado';
  const patientCpf = patient?.cpf || 'Não informado';
  const patientCns = patient?.cns || patient?.susCard || 'Não informado';

  const recordDateObj = record.recordDate ? new Date(record.recordDate) : new Date();
  const recordDateFormatted = recordDateObj.toLocaleDateString('pt-BR');
  const recordTimeFormatted = recordDateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // Data por extenso (ex: 29 de outubro de 2026)
  const dateLongFormatted = recordDateObj.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Médico
  const doctorName =
    record.doctor?.name ||
    record.doctor?.user?.name ||
    currentDoctor?.user?.name ||
    currentDoctor?.name ||
    'Médico Responsável';

  const docData = record.doctor?.doctors?.[0] || record.doctor || currentDoctor;
  const doctorCrm = docData?.crm
    ? `${docData.crm}${docData.crmState ? '/' + docData.crmState : ''}`
    : '';

  const specialtiesArr =
    record.doctor?.doctors?.[0]?.doctorSpecialties ||
    record.doctor?.doctorSpecialties ||
    currentDoctor?.doctorSpecialties;

  const doctorSpecialties = specialtiesArr && specialtiesArr.length > 0
    ? specialtiesArr.map((s: any) => s.specialty?.name || s.name).filter(Boolean).join(', ')
    : 'Clínica Médica';

  // CID
  const primaryCid = record.cid10 || record.selectedCids?.[0] || '';

  // Unidade Executante onde a consulta é realizada e o documento emitido
  const resolvedUnit = resolveExecutingUnit([
    executingUnit,
    record,
    (record as any)?.appointment,
    unitInfo,
    patient?.healthCenter,
  ]);
  const unitName = resolvedUnit.name || 'POLICLINICA REGIONAL';
  const unitCnes = resolvedUnit.cnes || '2606712';
  const unitCity = unitInfo?.city || patient?.healthCenter?.noMunicipio || 'SAO BENTO';
  const unitState = unitInfo?.state || patient?.healthCenter?.sgUf || 'PB';

  const handlePrint = () => {
    window.print();
  };

  const isCompanionValid = beneficiary === 'paciente' || (companionName.trim().length >= 3 && companionCpf.replace(/\D/g, '').length === 11);

  const modalContent = (
    <div
      id="certificate-print-modal-portal"
      className="fixed inset-0 z-[9999] bg-slate-900/75 backdrop-blur-xs flex flex-col items-center justify-start overflow-y-auto p-2 sm:p-6 print:p-0 print:static print:bg-white"
    >
      {/* BARRA SUPERIOR DE AÇÕES E CONFIGURAÇÃO (OCULTA NA IMPRESSÃO) */}
      <div className="no-print w-full max-w-[210mm] bg-white dark:bg-slate-800 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 p-4 mb-4 flex flex-col gap-4 sticky top-2 z-10">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
          <div className="flex items-center gap-2">
            {docType === 'atestado' ? (
              <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            )}
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                Emissão de {docType === 'atestado' ? 'Atestado Médico' : 'Declaração de Comparecimento'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure os dados do documento para visualização e impressão em folha A4 oficial
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={!isCompanionValid}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-md text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-sm active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Documento</span>
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

        {/* CONTROLES DO FORMULÁRIO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Tipo de Documento e Destinatário */}
          <div className="space-y-3 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-md border border-slate-200 dark:border-slate-700">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider text-[11px]">
                Tipo de Documento
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDocType('atestado')}
                  className={`flex-1 py-1.5 px-3 rounded-md font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer border ${
                    docType === 'atestado'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  Atestado Médico
                </button>
                <button
                  type="button"
                  onClick={() => setDocType('declaracao')}
                  className={`flex-1 py-1.5 px-3 rounded-md font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer border ${
                    docType === 'declaracao'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  Declaração Comparecimento
                </button>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider text-[11px]">
                Emitir Para
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBeneficiary('paciente')}
                  className={`flex-1 py-1.5 px-3 rounded-md font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer border ${
                    beneficiary === 'paciente'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  O Paciente
                </button>
                <button
                  type="button"
                  onClick={() => setBeneficiary('acompanhante')}
                  className={`flex-1 py-1.5 px-3 rounded-md font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer border ${
                    beneficiary === 'acompanhante'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  Acompanhante
                </button>
              </div>
            </div>

            {/* Campos do Acompanhante se selecionado */}
            {beneficiary === 'acompanhante' && (
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700 animate-in fade-in duration-200">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nome Completo do Acompanhante <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={companionName}
                    onChange={(e) => setCompanionName(e.target.value)}
                    placeholder="Ex: Maria das Graças da Silva"
                    className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    CPF do Acompanhante <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={companionCpf}
                    onChange={(e) => setCompanionCpf(formatCpf(e.target.value))}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Parâmetros Específicos do Documento */}
          <div className="space-y-3 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-md border border-slate-200 dark:border-slate-700">
            {docType === 'atestado' ? (
              <>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider text-[11px]">
                    Quantidade de Dias de Afastamento <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={90}
                      value={days}
                      onChange={(e) => setDays(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-24 px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm text-center"
                    />
                    <span className="text-slate-600 dark:text-slate-400 font-medium">
                      dia(s) ({numberToWordsPtBr(days)})
                    </span>
                  </div>
                </div>

                {primaryCid && (
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={includeCid}
                        onChange={(e) => setIncludeCid(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded border-slate-300"
                      />
                      <span className="text-slate-700 dark:text-slate-300 font-medium text-xs">
                        Constar diagnóstico / CID-10 a pedido do paciente
                      </span>
                    </label>
                    {includeCid && (
                      <span className="inline-block mt-1 text-[11px] font-mono bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                        {primaryCid}
                      </span>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Observação Clínica / Recomendações (Opcional)
                  </label>
                  <input
                    type="text"
                    value={medicalNotes}
                    onChange={(e) => setMedicalNotes(e.target.value)}
                    placeholder="Ex: Necessita de repouso domiciliar estrito."
                    className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider text-[11px]">
                    Período do Comparecimento
                  </label>
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setPeriodMode('horario')}
                      className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer border ${
                        periodMode === 'horario'
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      Horário Específico
                    </button>
                    <button
                      type="button"
                      onClick={() => setPeriodMode('turno')}
                      className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer border ${
                        periodMode === 'turno'
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      Por Turno
                    </button>
                  </div>

                  {periodMode === 'horario' ? (
                    <div className="flex items-center gap-2">
                      <div>
                        <span className="text-[10px] text-slate-500 block mb-0.5">Das</span>
                        <input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs"
                        />
                      </div>
                      <span className="text-slate-500 self-end mb-1">às</span>
                      <div>
                        <span className="text-[10px] text-slate-500 block mb-0.5">Até</span>
                        <input
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <select
                        value={shift}
                        onChange={(e: any) => setShift(e.target.value)}
                        className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                      >
                        <option value="Manhã">Turno da Manhã</option>
                        <option value="Tarde">Turno da Tarde</option>
                        <option value="Noite">Turno da Noite</option>
                        <option value="Integral">Turno Integral</option>
                      </select>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* CONTAINER DO DOCUMENTO A4 OFICIAL */}
      <div
        id="certificate-print-document"
        className="w-full max-w-[210mm] min-h-[297mm] h-[297mm] max-h-[297mm] bg-white text-slate-900 shadow-2xl p-[14mm] sm:p-[18mm] rounded-sm border border-slate-200 flex flex-col justify-between box-border overflow-hidden select-text"
      >
        {/* CABEÇALHO OFICIAL COM BRASÃO */}
        <div>
          <div className="flex items-center justify-between pb-4 border-b-2 border-slate-900 gap-4">
            <div className="w-20 h-20 shrink-0 flex items-center justify-center">
              <img
                src="/brasao.png"
                alt="Brasão Oficial"
                className="max-h-20 max-w-20 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>

            <div className="flex-1 text-center px-2">
              <h1 className="text-xs font-black tracking-widest text-slate-800 uppercase">
                PREFEITURA MUNICIPAL • SECRETARIA DE SAÚDE
              </h1>
              <h2 className="text-sm font-extrabold text-blue-950 uppercase tracking-wide mt-0.5">
                SISTEMA INTEGRADO DE PRONTUÁRIO ELETRÔNICO DO PACIENTE
              </h2>
              <div className="text-xs font-bold text-slate-700 mt-1">
                {unitName} {unitCnes && unitCnes !== '0000000' && `• CNES: ${unitCnes}`}
              </div>
            </div>

            <div className="w-24 text-right shrink-0 border-l border-slate-300 pl-3">
              <div className="text-[10px] font-bold uppercase text-slate-500">Documento</div>
              <div className="text-[11px] font-black text-slate-900 leading-tight uppercase">
                {docType === 'atestado' ? 'ATESTADO' : 'DECLARAÇÃO'}
              </div>
              <div className="text-[10px] text-slate-600 mt-1">{recordDateFormatted}</div>
            </div>
          </div>

          {/* TÍTULO CENTRAL DO DOCUMENTO */}
          <div className="text-center my-10">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-widest border-b-2 border-slate-900 inline-block px-8 pb-1">
              {docType === 'atestado' ? 'ATESTADO MÉDICO' : 'DECLARAÇÃO DE COMPARECIMENTO'}
            </h2>
          </div>
        </div>

        {/* CORPO DO TEXTO FORMAL */}
        <div className="flex-1 px-4 sm:px-8 flex flex-col justify-center space-y-6 text-slate-800 leading-relaxed text-justify text-base sm:text-lg">
          {docType === 'atestado' ? (
            beneficiary === 'paciente' ? (
              <p>
                Atesto para os devidos fins que o(a) Sr(a).{' '}
                <strong className="font-extrabold uppercase text-slate-950 underline decoration-slate-400 underline-offset-4">
                  {patientName}
                </strong>
                , portador(a) do CPF nº{' '}
                <strong className="font-mono font-bold text-slate-950">{patientCpf}</strong>{' '}
                {patientCns && patientCns !== 'Não informado' && (
                  <span>e Cartão SUS nº <strong className="font-mono font-bold text-slate-950">{patientCns}</strong></span>
                )}
                , esteve sob meus cuidados profissionais nesta unidade de saúde em{' '}
                <strong>{recordDateFormatted}</strong> às <strong>{recordTimeFormatted}</strong>, necessitando de{' '}
                <strong className="font-bold text-slate-950 bg-slate-100 px-1 py-0.5 rounded border border-slate-300">
                  {days} ({numberToWordsPtBr(days)}) dia(s)
                </strong>{' '}
                de repouso e afastamento de suas atividades laborais e escolares a contar desta data, por motivo de saúde.
              </p>
            ) : (
              <p>
                Atesto para os devidos fins que o(a) Sr(a).{' '}
                <strong className="font-extrabold uppercase text-slate-950 underline decoration-slate-400 underline-offset-4">
                  {companionName || '[NOME DO ACOMPANHANTE NÃO PREENCHIDO]'}
                </strong>
                , portador(a) do CPF nº{' '}
                <strong className="font-mono font-bold text-slate-950">
                  {companionCpf || '[CPF DO ACOMPANHANTE]'}
                </strong>
                , esteve presente nesta unidade de saúde em{' '}
                <strong>{recordDateFormatted}</strong> prestando acompanhamento e assistência indispensável ao(à) paciente{' '}
                <strong className="font-bold text-slate-950 uppercase">{patientName}</strong>, portador(a) do CPF nº{' '}
                <strong className="font-mono font-bold text-slate-950">{patientCpf}</strong>, necessitando de{' '}
                <strong className="font-bold text-slate-950 bg-slate-100 px-1 py-0.5 rounded border border-slate-300">
                  {days} ({numberToWordsPtBr(days)}) dia(s)
                </strong>{' '}
                de afastamento de suas atividades para acompanhar o tratamento do referido paciente a contar desta data.
              </p>
            )
          ) : (
            beneficiary === 'paciente' ? (
              <p>
                Declaro para os devidos fins que o(a) Sr(a).{' '}
                <strong className="font-extrabold uppercase text-slate-950 underline decoration-slate-400 underline-offset-4">
                  {patientName}
                </strong>
                , portador(a) do CPF nº{' '}
                <strong className="font-mono font-bold text-slate-950">{patientCpf}</strong>{' '}
                {patientCns && patientCns !== 'Não informado' && (
                  <span>e Cartão SUS nº <strong className="font-mono font-bold text-slate-950">{patientCns}</strong></span>
                )}
                , compareceu a esta unidade de saúde no dia{' '}
                <strong>{recordDateFormatted}</strong>, no{' '}
                {periodMode === 'horario' ? (
                  <span>
                    período das <strong className="font-mono font-bold text-slate-950">{startTime}</strong> às{' '}
                    <strong className="font-mono font-bold text-slate-950">{endTime}</strong>
                  </span>
                ) : (
                  <span>
                    <strong className="font-bold text-slate-950">{shift}</strong>
                  </span>
                )}
                , para a realização de consulta médica e atendimento clínico ambulatorial.
              </p>
            ) : (
              <p>
                Declaro para os devidos fins que o(a) Sr(a).{' '}
                <strong className="font-extrabold uppercase text-slate-950 underline decoration-slate-400 underline-offset-4">
                  {companionName || '[NOME DO ACOMPANHANTE NÃO PREENCHIDO]'}
                </strong>
                , portador(a) do CPF nº{' '}
                <strong className="font-mono font-bold text-slate-950">
                  {companionCpf || '[CPF DO ACOMPANHANTE]'}
                </strong>
                , esteve presente nesta unidade de saúde no dia{' '}
                <strong>{recordDateFormatted}</strong>, no{' '}
                {periodMode === 'horario' ? (
                  <span>
                    período das <strong className="font-mono font-bold text-slate-950">{startTime}</strong> às{' '}
                    <strong className="font-mono font-bold text-slate-950">{endTime}</strong>
                  </span>
                ) : (
                  <span>
                    <strong className="font-bold text-slate-950">{shift}</strong>
                  </span>
                )}
                , na condição de acompanhante do(a) paciente{' '}
                <strong className="font-bold text-slate-950 uppercase">{patientName}</strong>, portador(a) do CPF nº{' '}
                <strong className="font-mono font-bold text-slate-950">{patientCpf}</strong>.
              </p>
            )
          )}

          {/* BOX DE CID (QUANDO ATESTADO E AUTORIZADO) */}
          {docType === 'atestado' && includeCid && primaryCid && (
            <div className="p-3 bg-slate-50 border border-slate-300 rounded text-xs text-slate-700">
              <span className="font-bold text-slate-900 uppercase">Classificação Internacional de Doenças (CID-10):</span>{' '}
              <span className="font-mono font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {primaryCid}
              </span>
              <p className="text-[10px] text-slate-500 italic mt-1">
                * Constar diagnóstico a pedido do paciente, em conformidade com as Resoluções CFM nº 1.658/2002 e 1.851/2008.
              </p>
            </div>
          )}

          {/* OBSERVAÇÕES MÉDICAS ADICIONAIS */}
          {docType === 'atestado' && medicalNotes && (
            <div className="text-sm italic text-slate-700 border-l-2 border-slate-400 pl-3">
              <strong>Observação médica:</strong> {medicalNotes}
            </div>
          )}
        </div>

        {/* DATA E ASSINATURA */}
        <div className="pt-6 border-t border-slate-200 space-y-8">
          <div className="text-center text-sm font-medium text-slate-700">
            {unitCity && unitCity !== 'Município' ? `${unitCity} - ${unitState}, ` : ''}
            {dateLongFormatted}.
          </div>

          <div className="flex justify-center">
            <div className="text-center w-80">
              <div className="border-b-2 border-slate-900 mb-1.5"></div>
              <div className="font-extrabold text-slate-950 text-sm sm:text-base">Dr(a). {doctorName}</div>
              <div className="text-xs text-slate-700 font-mono font-semibold">
                {doctorCrm ? `CRM: ${doctorCrm}` : 'Carimbo / Assinatura do Médico'}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">{doctorSpecialties}</div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-100">
            <span>SINPEP • Sistema Integrado de Prontuário Eletrônico do Paciente</span>
            <span>Documento emitido eletronicamente • Autenticidade verificável</span>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

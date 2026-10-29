import React from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, Scissors, Activity, Pill, Stethoscope } from 'lucide-react';

export interface PrescriptionPrintRecord {
  recordDate?: string;
  observation?: string;
  cid10?: string;
  cid10Secondary?: string;
  cid10AssociatedCauses?: string;
  selectedCids?: string[];
  medications?: Array<{ name: string; dosage?: string }>;
  medicationsJustification?: string;
  requestedExams?: string[];
  examsJustification?: string;
  hasReturn?: boolean;
  returnRequestedValue?: number | string;
  returnRequestedUnit?: string;
  doctor?: any;
}

export interface PrescriptionPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient?: any;
  record?: PrescriptionPrintRecord | null;
  currentDoctor?: any;
  unitInfo?: {
    name?: string;
    cnes?: string;
    address?: string;
    phone?: string;
  };
}

export const PrescriptionPrintModal: React.FC<PrescriptionPrintModalProps> = ({
  isOpen,
  onClose,
  patient,
  record,
  currentDoctor,
  unitInfo,
}) => {
  if (!isOpen || !record) return null;

  // Extração e normalização dos dados do paciente
  const patientName = patient?.name || 'Não identificado';
  const patientCpf = patient?.cpf || 'Não informado';
  const patientCns = patient?.cns || patient?.susCard || 'Não informado';
  const patientBirthDate = patient?.birthDate ? new Date(patient.birthDate).toLocaleDateString('pt-BR') : '';
  
  const calculateAge = (birthDateString?: string) => {
    if (!birthDateString) return '';
    const birth = new Date(birthDateString);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
      age--;
    }
    return `${age} anos`;
  };
  const patientAge = calculateAge(patient?.birthDate);
  const patientGender = patient?.gender === 'M' ? 'Masculino' : patient?.gender === 'F' ? 'Feminino' : patient?.gender || 'Não informado';

  // Extração e normalização das datas
  const recordDateObj = record.recordDate ? new Date(record.recordDate) : new Date();
  const recordDateFormatted = recordDateObj.toLocaleDateString('pt-BR');
  const recordTimeFormatted = recordDateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // Extração e normalização do profissional médico
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

  // CIDs
  const primaryCid = record.cid10 || record.selectedCids?.[0] || '';
  const secondaryCid = record.cid10Secondary || record.selectedCids?.[1] || '';
  const associatedCid = record.cid10AssociatedCauses || record.selectedCids?.[2] || '';

  // Medicações
  const validMeds = (record.medications || []).filter(m => m && m.name && m.name.trim().length > 0);

  // Exames
  const validExams = (record.requestedExams || []).filter(e => e && e.trim().length > 0);

  // Retorno
  const returnVal = record.returnRequestedValue;
  const returnUnit = (record.returnRequestedUnit || 'DIAS').toUpperCase();
  const hasReturn = Boolean(
    (record.hasReturn !== undefined ? record.hasReturn : Boolean(returnVal)) &&
    returnVal &&
    String(returnVal).trim() !== ''
  );

  const calculateReturnDate = (baseDate: Date, val?: number | string, unit?: string) => {
    if (!val) return null;
    const num = typeof val === 'string' ? parseInt(val, 10) : val;
    if (isNaN(num)) return null;
    const d = new Date(baseDate);
    const u = (unit || 'DIAS').toUpperCase();
    if (u.includes('DIA')) d.setDate(d.getDate() + num);
    else if (u.includes('MES') || u.includes('MÊS')) d.setMonth(d.getMonth() + num);
    else if (u.includes('ANO')) d.setFullYear(d.getFullYear() + num);
    return d.toLocaleDateString('pt-BR');
  };
  const estimatedReturnDate = calculateReturnDate(recordDateObj, returnVal, returnUnit);

  // Unidade de Saúde
  const unitName = unitInfo?.name || patient?.healthCenter?.name || 'CENTRO DE SAÚDE / AMBULATÓRIO DE ESPECIALIDADES';
  const unitCnes = unitInfo?.cnes || patient?.healthCenter?.cnes || '0000000';

  const handlePrint = () => {
    window.print();
  };

  const modalContent = (
    <div
      id="prescription-print-modal-portal"
      className="fixed inset-0 z-[9999] bg-slate-900/75 backdrop-blur-xs flex flex-col items-center justify-start overflow-y-auto p-2 sm:p-6 print:p-0 print:static print:bg-white"
    >
      {/* BARRA SUPERIOR DE AÇÕES (OCULTA NA IMPRESSÃO) */}
      <div className="no-print w-full max-w-[210mm] bg-white dark:bg-slate-800 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 px-4 py-3 mb-4 flex items-center justify-between gap-3 sticky top-2 z-10">
        <div className="flex items-center gap-2 text-slate-800 dark:text-white">
          <Stethoscope className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <div>
            <h3 className="text-sm sm:text-base font-bold leading-tight">Visualização de Impressão</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Folha A4: 4/5 Prescrição Médica & Exames + 1/5 Canhoto de Retorno</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-sm active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
            title="Fechar Visualização"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* CONTAINER DO DOCUMENTO A4 */}
      <div
        id="prescription-print-document"
        className="w-full max-w-[210mm] min-h-[297mm] h-[297mm] max-h-[297mm] bg-white text-slate-900 shadow-2xl p-[8mm] sm:p-[10mm] rounded-sm border border-slate-200 flex flex-col justify-between box-border overflow-hidden select-text"
      >
        {/* PARTE 1 A 4: PRESCRIÇÃO E SOLICITAÇÃO DE EXAMES (80% / 4/5 DA PÁGINA) */}
        <div className="h-[78%] flex flex-col justify-between overflow-hidden">
          {/* TOPO: CABEÇALHO INSTITUCIONAL */}
          <div>
            <div className="flex items-center justify-between pb-2 border-b-2 border-slate-800 gap-3">
              <div className="w-16 h-16 shrink-0 flex items-center justify-center">
                <img
                  src="/brasao.png"
                  alt="Brasão Oficial"
                  className="max-h-16 max-w-16 object-contain"
                  onError={(e) => {
                    // Fallback visual caso brasao.png não carregue
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>

              <div className="flex-1 text-center px-2">
                <h1 className="text-xs font-black tracking-widest text-slate-800 uppercase">
                  PREFEITURA MUNICIPAL • SECRETARIA DE SAÚDE
                </h1>
                <h2 className="text-sm font-extrabold text-blue-900 uppercase tracking-wide">
                  SISTEMA INTEGRADO DE PRONTUÁRIO ELETRÔNICO DO PACIENTE
                </h2>
                <div className="text-[11px] font-semibold text-slate-700">
                  {unitName} {unitCnes && unitCnes !== '0000000' && `• CNES: ${unitCnes}`}
                </div>
              </div>

              <div className="w-28 text-right shrink-0 border-l border-slate-300 pl-2">
                <div className="text-[10px] font-bold uppercase text-slate-500">Documento</div>
                <div className="text-[11px] font-extrabold text-slate-900 leading-tight">PRESCRIÇÃO & EXAMES</div>
                <div className="text-[10px] text-slate-600 mt-0.5">{recordDateFormatted} às {recordTimeFormatted}</div>
              </div>
            </div>

            {/* DADOS DO PACIENTE E PROFISSIONAL */}
            <div className="mt-2.5 p-2 bg-slate-50 border border-slate-300 rounded text-xs grid grid-cols-2 gap-x-4 gap-y-1">
              <div>
                <span className="font-bold text-slate-600">PACIENTE:</span>{' '}
                <span className="font-extrabold text-slate-900 uppercase">{patientName}</span>
              </div>
              <div>
                <span className="font-bold text-slate-600">MÉDICO(A):</span>{' '}
                <span className="font-extrabold text-slate-900">Dr(a). {doctorName}</span>
              </div>
              <div className="flex items-center gap-3">
                <span><strong className="text-slate-600">CPF:</strong> {patientCpf}</span>
                <span><strong className="text-slate-600">CNS:</strong> {patientCns}</span>
              </div>
              <div>
                <span className="font-bold text-slate-600">CRM:</span>{' '}
                <span className="font-semibold">{doctorCrm || 'Não informado'}</span>
                {doctorSpecialties && (
                  <span className="text-slate-600 text-[11px]"> • {doctorSpecialties}</span>
                )}
              </div>
              <div className="col-span-2 flex items-center gap-4 text-[11px] text-slate-700 border-t border-slate-200 pt-1 mt-0.5">
                {patientBirthDate && <span><strong>Nascimento:</strong> {patientBirthDate} ({patientAge})</span>}
                <span><strong>Sexo:</strong> {patientGender}</span>
                {patient?.address && <span className="truncate"><strong>Endereço:</strong> {patient.address}</span>}
              </div>
            </div>

            {/* CIDS DIAGNOSTICADOS */}
            {primaryCid && (
              <div className="mt-2 flex items-center flex-wrap gap-2 text-xs">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">Diagnóstico (CID-10):</span>
                <span className="px-2 py-0.5 rounded font-mono font-bold bg-blue-100 text-blue-900 border border-blue-300">
                  Primário: {primaryCid}
                </span>
                {secondaryCid && (
                  <span className="px-2 py-0.5 rounded font-mono font-semibold bg-purple-50 text-purple-900 border border-purple-200">
                    Secundário: {secondaryCid}
                  </span>
                )}
                {associatedCid && (
                  <span className="px-2 py-0.5 rounded font-mono font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                    Causas Assoc.: {associatedCid}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* CORPO CENTRAL: OBSERVAÇÕES / MEDICAMENTOS / EXAMES */}
          <div className="flex-1 my-2 overflow-hidden flex flex-col justify-start space-y-2.5">
            {/* CONDUTA CLÍNICA / PRESCRIÇÃO */}
            {record.observation && (
              <div className="border border-slate-300 rounded p-2 bg-white">
                <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-1 pb-1 border-b border-slate-200">
                  <Stethoscope className="w-3.5 h-3.5 text-blue-700" />
                  <span>História Clínica & Prescrição Médica</span>
                </div>
                <div className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed max-h-24 overflow-hidden">
                  {record.observation}
                </div>
              </div>
            )}

            {/* TABELA DE MEDICAMENTOS */}
            {validMeds.length > 0 && (
              <div className="border border-slate-300 rounded overflow-hidden">
                <div className="bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between border-b border-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Pill className="w-3.5 h-3.5 text-green-700" />
                    Medicações Prescritas ({validMeds.length})
                  </span>
                </div>
                <div className="p-1.5 bg-white space-y-1">
                  <div className="grid grid-cols-12 text-[10px] font-bold uppercase text-slate-500 px-2 py-0.5 border-b border-slate-100">
                    <span className="col-span-5">Medicamento / Fármaco</span>
                    <span className="col-span-7">Posologia / Instruções de Uso</span>
                  </div>
                  {validMeds.map((med, idx) => (
                    <div key={idx} className="grid grid-cols-12 text-xs text-slate-800 px-2 py-1 bg-slate-50/70 rounded border border-slate-200">
                      <span className="col-span-5 font-bold text-slate-900">{med.name}</span>
                      <span className="col-span-7 text-slate-700">{med.dosage || 'Conforme orientação médica.'}</span>
                    </div>
                  ))}
                  {record.medicationsJustification && (
                    <div className="text-[10px] text-slate-600 bg-amber-50 p-1.5 rounded border border-amber-200 italic mt-1">
                      <strong>Justificativa da Prescrição:</strong> {record.medicationsJustification}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* EXAMES E PROCEDIMENTOS SOLICITADOS */}
            {validExams.length > 0 && (
              <div className="border border-slate-300 rounded overflow-hidden">
                <div className="bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between border-b border-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-blue-700" />
                    Exames e Procedimentos Solicitados ({validExams.length})
                  </span>
                </div>
                <div className="p-1.5 bg-white space-y-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-28 overflow-hidden">
                    {validExams.map((exam, idx) => {
                      const [code, ...nameParts] = exam.split(' - ');
                      const examName = nameParts.join(' - ');
                      return (
                        <div key={idx} className="flex items-center gap-1.5 p-1 bg-slate-50 rounded border border-slate-200 text-xs">
                          <span className="font-mono font-bold text-blue-800 text-[11px] shrink-0">{code}</span>
                          <span className="text-slate-800 truncate" title={examName || exam}>{examName || exam}</span>
                        </div>
                      );
                    })}
                  </div>
                  {record.examsJustification && (
                    <div className="text-[10px] text-slate-600 bg-blue-50 p-1.5 rounded border border-blue-200 italic mt-1">
                      <strong>Justificativa Clínica:</strong> {record.examsJustification}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* BASE DA PRESCRIÇÃO: ASSINATURA E CARIMBO DO MÉDICO */}
          <div className="pt-2 border-t border-slate-200 flex justify-between items-end text-xs">
            <div className="text-[10px] text-slate-500">
              <div>Emitido via SINPEP • Prontuário Eletrônico do Paciente</div>
              <div>Data de Validade da Prescrição: Conforme normas do CFM / SUS</div>
            </div>

            <div className="text-center w-64">
              <div className="border-b border-slate-800 mb-1"></div>
              <div className="font-bold text-slate-900 text-xs">Dr(a). {doctorName}</div>
              <div className="text-[11px] text-slate-700 font-mono">
                {doctorCrm ? `CRM: ${doctorCrm}` : 'Carimbo / Assinatura'}
              </div>
              <div className="text-[10px] text-slate-500">{doctorSpecialties}</div>
            </div>
          </div>
        </div>

        {/* SEÇÃO INFERIOR: CANHOTO DE RETORNO OU ÁREA VAZIA */}
        {hasReturn ? (
          <>
            {/* LINHA DE CORTE DESTACÁVEL (DIVISÃO 4/5 vs 1/5) */}
            <div className="h-[2%] flex items-center justify-center my-0.5 relative">
              <div className="w-full border-t-2 border-dashed border-slate-400"></div>
              <div className="absolute bg-white px-2 text-[10px] font-mono text-slate-500 flex items-center gap-1.5 uppercase tracking-wider">
                <Scissors className="w-3.5 h-3.5 text-slate-600" />
                <span>Destaque aqui • Canhoto de Retorno do Paciente</span>
                <Scissors className="w-3.5 h-3.5 text-slate-600 rotate-180" />
              </div>
            </div>

            {/* PARTE 5: CANHOTO DE RETORNO DESTACÁVEL (20% / 1/5 DA PÁGINA) */}
            <div className="h-[20%] border border-slate-300 rounded p-2.5 bg-slate-50/70 flex flex-col justify-between box-border">
              {/* CABEÇALHO DO CANHOTO */}
              <div className="flex items-center justify-between pb-1 border-b border-slate-300">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 shrink-0 flex items-center justify-center">
                    <img src="/brasao.png" alt="Brasão" className="max-h-8 max-w-8 object-contain" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 uppercase">
                      COMPROVANTE DE ENCAMINHAMENTO / RETORNO AMBULATORIAL
                    </h3>
                    <p className="text-[10px] text-slate-600 font-medium">
                      {unitName} • Atendimento em {recordDateFormatted}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Via do Paciente</span>
                  <span className="text-[10px] text-slate-600">{recordDateFormatted}</span>
                </div>
              </div>

              {/* DADOS E RETORNO SOLICITADO */}
              <div className="grid grid-cols-12 gap-2 my-1 items-center">
                <div className="col-span-8 text-xs space-y-0.5">
                  <div>
                    <strong className="text-slate-600">Paciente:</strong>{' '}
                    <span className="font-extrabold uppercase text-slate-900">{patientName}</span>
                  </div>
                  <div className="text-[11px] text-slate-700">
                    <span><strong>CPF:</strong> {patientCpf}</span>
                    <span className="ml-3"><strong>CNS:</strong> {patientCns}</span>
                  </div>
                  <div className="text-[11px] text-slate-700">
                    <strong>Médico Solicitante:</strong> Dr(a). {doctorName} ({doctorCrm || 'CRM N/I'})
                  </div>
                </div>

                <div className="col-span-4 text-center p-1.5 bg-amber-50 border border-amber-300 rounded">
                  <div className="text-[9px] font-bold text-amber-800 uppercase tracking-wider">Prazo de Retorno:</div>
                  <div className="text-sm font-black text-amber-950 font-mono">
                    {returnVal} {returnUnit}
                  </div>
                  {estimatedReturnDate && (
                    <div className="text-[9px] text-amber-800 font-semibold">
                      Previsão até: {estimatedReturnDate}
                    </div>
                  )}
                </div>
              </div>

              {/* ORIENTAÇÃO AO PACIENTE E CARIMBO DA RECEPÇÃO */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-[10px] text-slate-600 gap-3">
                <div className="flex-1 italic">
                  * Apresente este canhoto na recepção da sua Unidade de Saúde para confirmação e agendamento da data de retorno conforme o prazo médico acima.
                </div>
                <div className="w-56 text-center border border-slate-300 rounded p-1 bg-white">
                  <div className="text-[9px] text-slate-500 uppercase font-semibold">Carimbo / Visto da Recepção</div>
                  <div className="text-[10px] text-slate-700 mt-1">Data Agendada: _____/_____/_________</div>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* ÁREA VAZIA (1/5 FINAL EM BRANCO) QUANDO NÃO HÁ RETORNO SOLICITADO */
          <div className="h-[22%]"></div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

import React from 'react';
import { createPortal } from 'react-dom';
import {
  Printer,
  X,
  FileText,
  Calendar,
  User,
  Stethoscope,
  Key,
  AlertCircle,
} from 'lucide-react';
import type { RegulationRequest } from '../../services/regulation';
import { useMunicipalityBranding } from '../../hooks/useMunicipalityBranding';
import { formatCPF, formatCNS } from '../../utils/brazilianFormatters';

export interface RegulationRequestPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: RegulationRequest | null;
}

export const RegulationRequestPrintModal: React.FC<RegulationRequestPrintModalProps> = ({
  isOpen,
  onClose,
  request,
}) => {
  const { branding } = useMunicipalityBranding();

  if (!isOpen || !request) return null;

  const handlePrint = () => {
    window.print();
  };

  // Extração e normalização dos dados do paciente
  const patient = request.patient;
  const patientName = patient?.name || 'Não identificado';
  const patientCpf = formatCPF(patient?.cpf);
  const patientCns = formatCNS(patient?.cns);
  const patientBirthDate = patient?.birthDate
    ? new Date(patient.birthDate).toLocaleDateString('pt-BR')
    : '';

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
  const patientGender =
    patient?.gender === 'M'
      ? 'Masculino'
      : patient?.gender === 'F'
        ? 'Feminino'
        : patient?.gender || 'Não informado';

  // Extração e formatação de datas
  const requestDateObj = request.createdAt ? new Date(request.createdAt) : new Date();
  const requestDateFormatted = requestDateObj.toLocaleDateString('pt-BR');
  const requestTimeFormatted = requestDateObj.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const scheduledDateFormatted = request.scheduledDate
    ? new Date(`${request.scheduledDate}T00:00:00`).toLocaleDateString('pt-BR')
    : null;

  // Unidade Solicitante
  const requestingUnitName = request.requestingHealthCenter?.name || 'Unidade Básica de Saúde';
  const requestingUnitCnes = request.requestingHealthCenter?.cnes || '';

  // Profissional Solicitante
  const requesterName =
    request.attendingDoctor?.name || request.requestingUser?.name || 'Profissional Solicitante';

  // Procedimento Solicitado
  const procedureTitle = request.procedure
    ? `${request.procedure.code} - ${request.procedure.name}`
    : request.specialty?.name || 'Consulta / Procedimento Especializado';

  const isScheduled = request.status === 'AGENDADA' && (request.scheduledDate || request.executingHealthCenter);

  const modalContent = (
    <div
      id="regulation-request-print-modal-portal"
      className="fixed inset-0 z-[9999] bg-slate-900/75 backdrop-blur-xs flex flex-col items-center justify-start overflow-y-auto p-2 sm:p-6 print:p-0 print:static print:bg-white"
    >
      {/* BARRA SUPERIOR DE AÇÕES (OCULTA NA IMPRESSÃO) */}
      <div className="no-print w-full max-w-[210mm] bg-white dark:bg-slate-800 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 px-4 py-3 mb-4 flex items-center justify-between gap-3 sticky top-2 z-10">
        <div className="flex items-center gap-2 text-slate-800 dark:text-white">
          <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <div>
            <h3 className="text-sm sm:text-base font-bold leading-tight">
              Ficha de Solicitação de Regulação
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Protocolo #{request.protocolNumber} • Folha A4 padrão SUS
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-sm active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Ficha</span>
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
        id="regulation-request-print-document"
        className="w-full max-w-[210mm] min-h-[297mm] bg-white text-slate-900 shadow-2xl p-[10mm] rounded-sm border border-slate-200 flex flex-col justify-between box-border overflow-hidden select-text text-xs"
      >
        <div className="space-y-4">
          {/* 1. CABEÇALHO INSTITUCIONAL */}
          <div className="flex items-center justify-between pb-3 border-b-2 border-slate-800 gap-4">
            <div className="w-16 h-16 shrink-0 flex items-center justify-center">
              <img
                src={branding?.coatOfArmsUrl || '/brasao.png'}
                alt="Brasão Oficial"
                className="max-h-16 max-w-16 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>

            <div className="flex-1 text-center px-2">
              <h1 className="text-xs font-black tracking-widest text-slate-800 uppercase">
                {branding?.fullName || 'ESTADO DA PARAÍBA • PREFEITURA MUNICIPAL'}
              </h1>
              <h2 className="text-xs font-bold text-slate-700 uppercase">
                {branding?.department || 'SECRETARIA MUNICIPAL DE SAÚDE'}
              </h2>
              <div className="text-[13px] font-extrabold text-blue-900 uppercase tracking-wide mt-0.5">
                SISTEMA INTEGRADO DE REGULAÇÃO MUNICIPAL (SINPeP)
              </div>
              <div className="text-[10px] font-semibold text-slate-600 mt-0.5">
                {requestingUnitName} {requestingUnitCnes && `• CNES: ${requestingUnitCnes}`}
              </div>
            </div>

            <div className="w-40 text-right shrink-0 border-l border-slate-300 pl-3">
              <div className="text-[9px] font-bold uppercase text-slate-500">Documento Oficial</div>
              <div className="text-[11px] font-extrabold text-emerald-800 leading-tight">
                {isScheduled ? 'COMPROVANTE DE AGENDAMENTO' : 'FICHA DE SOLICITAÇÃO'}
              </div>
              <div className="text-[10px] font-mono font-bold text-slate-900 mt-1">
                #{request.protocolNumber}
              </div>
              <div className="text-[9px] text-slate-500">
                Emitido em {requestDateFormatted} às {requestTimeFormatted}
              </div>
            </div>
          </div>

          {/* 2. STATUS & PROTOCOLO EM DESTAQUE */}
          <div className="p-2.5 bg-slate-50 border border-slate-300 rounded-md flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Número do Protocolo:</span>
              <span className="text-base font-black font-mono text-slate-900 tracking-wider">
                {request.protocolNumber}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Classificação de Risco:</span>
                <span className="text-xs font-bold text-amber-700 uppercase bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {request.priority}
                </span>
              </div>

              <div className="text-right pl-3 border-l border-slate-300">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Situação Atual:</span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded border ${isScheduled
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-blue-100 text-blue-800 border-blue-300'
                    }`}
                >
                  {isScheduled ? 'AGENDADA NA ESCALA' : 'PENDENTE DE REGULAÇÃO'}
                </span>
              </div>
            </div>
          </div>

          {/* 3. DADOS DO PACIENTE */}
          <div className="border border-slate-300 rounded-md overflow-hidden">
            <div className="bg-slate-100 px-3 py-1 border-b border-slate-300 text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-600" />
              <span>Identificação do Paciente</span>
            </div>
            <div className="p-3 bg-white grid grid-cols-3 gap-x-4 gap-y-2 text-xs">
              <div className="col-span-2">
                <span className="font-bold text-slate-600 block text-[10px] uppercase">Nome Completo:</span>
                <span className="font-extrabold text-slate-900 uppercase text-sm block">
                  {patientName}
                </span>
              </div>
              <div>
                <span className="font-bold text-slate-600 block text-[10px] uppercase">Sexo:</span>
                <span className="font-semibold text-slate-800">{patientGender}</span>
              </div>

              <div>
                <span className="font-bold text-slate-600 block text-[10px] uppercase">CPF:</span>
                <span className="font-mono font-bold text-slate-900">{patientCpf}</span>
              </div>
              <div>
                <span className="font-bold text-slate-600 block text-[10px] uppercase">Cartão SUS (CNS):</span>
                <span className="font-mono font-bold text-blue-700">{patientCns}</span>
              </div>
              <div>
                <span className="font-bold text-slate-600 block text-[10px] uppercase">Data de Nasc. (Idade):</span>
                <span className="font-semibold text-slate-800">
                  {patientBirthDate ? `${patientBirthDate} (${patientAge})` : 'Não informada'}
                </span>
              </div>

              {patient?.address && (
                <div className="col-span-3 border-t border-slate-100 pt-1.5">
                  <span className="font-bold text-slate-600 text-[10px] uppercase">Endereço: </span>
                  <span className="text-slate-800">{patient.address}</span>
                </div>
              )}
            </div>
          </div>

          {/* 4. DADOS CLÍNICOS DA SOLICITAÇÃO */}
          <div className="border border-slate-300 rounded-md overflow-hidden">
            <div className="bg-slate-100 px-3 py-1 border-b border-slate-300 text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Stethoscope className="w-3.5 h-3.5 text-slate-600" />
              <span>Dados Clínicos e Procedimento Solicitado</span>
            </div>
            <div className="p-3 bg-white space-y-2.5 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <span className="font-bold text-slate-600 block text-[10px] uppercase">
                    Procedimento / Especialidade:
                  </span>
                  <span className="font-bold text-blue-900 text-sm block">
                    {procedureTitle}
                  </span>
                  {request.procedureGroup && (
                    <span className="text-[10px] text-slate-500">
                      Grupo: {request.procedureGroup.name}
                    </span>
                  )}
                </div>

                <div>
                  <span className="font-bold text-slate-600 block text-[10px] uppercase">
                    Regime de Atendimento:
                  </span>
                  <span className="font-semibold text-slate-800 block">
                    {request.procedure?.requiresRegulation ? 'Procedimento Regulado' : 'Acesso Direto'}
                  </span>
                  <span className="text-[10px] text-slate-500">Tipo: {request.type}</span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-2">
                <span className="font-bold text-slate-600 block text-[10px] uppercase">
                  Diagnóstico / Hipótese (CID-10):
                </span>
                <span className="inline-block px-2 py-0.5 mt-0.5 rounded font-mono font-bold bg-slate-100 text-slate-900 border border-slate-300">
                  {request.cid10}
                </span>
              </div>

              <div className="border-t border-slate-100 pt-2">
                <span className="font-bold text-slate-600 block text-[10px] uppercase">
                  Justificativa Clínica:
                </span>
                <p className="text-slate-800 whitespace-pre-wrap leading-relaxed bg-slate-50/70 p-2 rounded border border-slate-200 mt-1">
                  {request.clinicalJustification}
                </p>
              </div>

              {request.clinicalHistory && (
                <div className="border-t border-slate-100 pt-2">
                  <span className="font-bold text-slate-600 block text-[10px] uppercase">
                    Histórico Clínico Relevante:
                  </span>
                  <p className="text-slate-700 whitespace-pre-wrap leading-relaxed mt-0.5">
                    {request.clinicalHistory}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 5. SE ESTIVER AGENDADO: QUADRO DE AGENDAMENTO E CHAVE */}
          {isScheduled && (
            <div className="border-2 border-emerald-600 bg-emerald-50/50 rounded-md p-3 text-xs space-y-2">
              <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                <div className="flex items-center gap-1.5 text-emerald-800 font-extrabold text-sm uppercase">
                  <Calendar className="w-4 h-4" />
                  <span>Dados do Atendimento Agendado</span>
                </div>
                {request.confirmationToken && (
                  <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded border border-emerald-300 font-mono text-xs font-bold text-emerald-900">
                    <Key className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Chave: {request.confirmationToken}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-600 uppercase block">Data do Atendimento:</span>
                  <span className="font-extrabold text-slate-900 text-sm">{scheduledDateFormatted}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-600 uppercase block">Horário:</span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    {request.scheduledTime || 'A partir do início da escala'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-600 uppercase block">Unidade Executante:</span>
                  <span className="font-bold text-slate-900 block truncate">
                    {request.executingHealthCenter?.name || 'Policlínica Municipal'}
                  </span>
                  {request.executingHealthCenter?.cnes && (
                    <span className="text-[10px] text-slate-500">
                      CNES: {request.executingHealthCenter.cnes}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 6. UNIDADE E PROFISSIONAL SOLICITANTE */}
          <div className="p-2.5 bg-slate-50 border border-slate-300 rounded-md text-xs grid grid-cols-2 gap-4">
            <div>
              <span className="font-bold text-slate-600 block text-[10px] uppercase">Unidade Solicitante:</span>
              <span className="font-bold text-slate-900 block">{requestingUnitName}</span>
              {requestingUnitCnes && (
                <span className="text-[10px] text-slate-500">CNES: {requestingUnitCnes}</span>
              )}
            </div>
            <div>
              <span className="font-bold text-slate-600 block text-[10px] uppercase">Profissional Solicitante:</span>
              <span className="font-bold text-slate-900 block">{requesterName}</span>
              <span className="text-[10px] text-slate-500">
                Data do Protocolo: {requestDateFormatted} {requestTimeFormatted}
              </span>
            </div>
          </div>

          {/* 7. ORIENTAÇÕES AO PACIENTE */}
          <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-md text-[11px] space-y-1 text-slate-700">
            <div className="flex items-center gap-1.5 font-bold text-blue-900 text-xs">
              <AlertCircle className="w-3.5 h-3.5 text-blue-700" />
              <span>Orientações Importantes ao Usuário</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[10px] text-slate-600 leading-normal pl-1">
              <li>
                <strong>Apresentação obrigatória:</strong> Documento oficial de identificação com foto (RG/CNH),
                Cartão SUS e este comprovante.
              </li>
              <li>
                {isScheduled
                  ? 'Chegue ao local de atendimento com no mínimo 15 minutos de antecedência do horário marcado.'
                  : 'Sua solicitação está na fila de regulação municipal. Guarde o protocolo para consultar o andamento na sua Unidade de Saúde.'}
              </li>
              <li>
                Caso não possa comparecer, comunique imediatamente sua unidade de saúde de origem para que a vaga seja ofertada a outro cidadão.
              </li>
            </ul>
          </div>
        </div>

        {/* 8.RODAPÉ */}
        <div className="pt-8 pb-2 border-t border-slate-300 mt-6 grid grid-cols-2 gap-8 text-center text-xs">
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

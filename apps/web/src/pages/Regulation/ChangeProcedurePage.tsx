import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRightLeft,
  ArrowRight,
  Save,
  FileText,
  User,
  AlertTriangle,
  Paperclip,
  Download,
  Search,
  History,
  Stethoscope,
  Activity,
  Scissors,
  Loader2,
  X,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRegulationRequest, useChangeRegulationProcedure } from '../../hooks/useRegulation';
import { useProcedures, useProcedureGroups } from '../../hooks/useProcedures';
import { apiUrl } from '../../services/api';
import type { RegulationRequestPriority, RegulationRequestType } from '../../services/regulation';
import { formatDateBR, formatDateTimeBR } from '../../utils/brazilianFormatters';
import {
  getRegulationStatusMeta,
  getStatusHistoryEventLabel,
} from '../../utils/regulationStatus';

export const ChangeProcedurePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Queries
  const { data: request, isLoading: isLoadingRequest } = useRegulationRequest(id || null);
  const changeProcedureMutation = useChangeRegulationProcedure();

  // Grupos e Procedimentos
  const { data: procedureGroupsData } = useProcedureGroups();
  const { data: proceduresData } = useProcedures({
    page: 1,
    limit: 500,
  });

  const allProcedures = useMemo(() => proceduresData?.data || [], [proceduresData]);
  const allGroups = useMemo(() => procedureGroupsData || [], [procedureGroupsData]);

  // Form States
  const [selectedType, setSelectedType] = useState<RegulationRequestType>('CONSULTA');
  const [selectedProcedureId, setSelectedProcedureId] = useState<string>('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [justification, setJustification] = useState<string>('');
  const [adjustedPriority, setAdjustedPriority] = useState<RegulationRequestPriority>('ELETIVO');
  const [adjustedCid10, setAdjustedCid10] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Inicializa dados com a solicitação existente
  useEffect(() => {
    if (request) {
      setSelectedType(request.type || 'CONSULTA');
      setSelectedProcedureId(request.procedureId || '');
      setSelectedGroupId(request.procedureGroupId || '');
      setAdjustedPriority(request.priority || 'ELETIVO');
      setAdjustedCid10(request.cid10 || '');
    }
  }, [request]);

  // Procedimentos filtrados pelo tipo selecionado e termo de busca
  const filteredProcedures = useMemo(() => {
    let procs = allProcedures;

    // Filtra pelo tipo selecionado
    if (selectedType === 'CONSULTA') {
      procs = procs.filter(
        (p) => p.code?.startsWith('03') || p.name.toUpperCase().startsWith('CONSULTA'),
      );
    } else if (selectedType === 'EXAME') {
      procs = procs.filter(
        (p) =>
          p.code?.startsWith('02') ||
          p.name.toUpperCase().includes('TOMOGRAFIA') ||
          p.name.toUpperCase().includes('ULTRASSOM') ||
          p.name.toUpperCase().includes('ULTRASONOGRAFIA') ||
          p.name.toUpperCase().includes('RESSONANCIA') ||
          p.name.toUpperCase().includes('RAIO-X') ||
          p.name.toUpperCase().includes('EXAME'),
      );
    } else if (selectedType === 'PROCEDIMENTO') {
      procs = procs.filter(
        (p) =>
          !p.code?.startsWith('02') &&
          !p.code?.startsWith('03') &&
          !p.name.toUpperCase().startsWith('CONSULTA'),
      );
    }

    // Se houver busca por texto
    if (searchFilter.trim()) {
      const q = searchFilter.trim().toLowerCase();
      procs = procs.filter(
        (p) => (p.name || '').toLowerCase().includes(q) || (p.code || '').toLowerCase().includes(q),
      );
    }

    return procs;
  }, [allProcedures, selectedType, searchFilter]);

  // Grupos filtrados pelo tipo
  const filteredGroups = useMemo(() => {
    if (selectedType === 'CONSULTA') {
      return allGroups.filter(
        (g) => g.groupCode?.startsWith('03') || g.name.toUpperCase().includes('CONSULTA'),
      );
    }
    if (selectedType === 'EXAME') {
      return allGroups.filter(
        (g) =>
          g.groupCode?.startsWith('02') ||
          g.name.toUpperCase().includes('EXAME') ||
          g.name.toUpperCase().includes('TOMOGRAFIA') ||
          g.name.toUpperCase().includes('ULTRASONOGRAFIA'),
      );
    }
    return allGroups.filter(
      (g) => !g.groupCode?.startsWith('02') && !g.groupCode?.startsWith('03'),
    );
  }, [allGroups, selectedType]);

  // Objeto do procedimento selecionado
  const selectedProcedureObj = useMemo(() => {
    return allProcedures.find((p) => p.id === selectedProcedureId) || null;
  }, [allProcedures, selectedProcedureId]);

  // Objeto do grupo selecionado
  const selectedGroupObj = useMemo(() => {
    return allGroups.find((g) => g.id === selectedGroupId) || null;
  }, [allGroups, selectedGroupId]);

  // Procedimento anterior formatado
  const previousProcedureLabel = useMemo(() => {
    if (!request) return '';
    if (request.procedure) {
      return `${request.procedure.code ? request.procedure.code + ' - ' : ''}${request.procedure.name}`;
    }
    if (request.procedureGroup) {
      return `[GRUPO] ${request.procedureGroup.name}`;
    }
    if (request.specialty) {
      return `[ESPECIALIDADE] ${request.specialty.name}`;
    }
    return 'Não especificado';
  }, [request]);

  // Novo procedimento proposto formatado
  const newProcedureLabel = useMemo(() => {
    if (selectedProcedureObj) {
      return `${selectedProcedureObj.code ? selectedProcedureObj.code + ' - ' : ''}${selectedProcedureObj.name}`;
    }
    if (selectedGroupObj) {
      return `[GRUPO] ${selectedGroupObj.name}`;
    }
    return 'Nenhum selecionado';
  }, [selectedProcedureObj, selectedGroupObj]);

  const isSameProcedure = useMemo(() => {
    if (!request) return false;
    return (
      request.procedureId === selectedProcedureId &&
      request.procedureGroupId === selectedGroupId &&
      request.type === selectedType
    );
  }, [request, selectedProcedureId, selectedGroupId, selectedType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!id) return;

    if (!selectedProcedureId && !selectedGroupId) {
      toast.error('Selecione o novo procedimento ou grupo de procedimentos.');
      return;
    }

    if (isSameProcedure) {
      toast.warning('O procedimento selecionado é idêntico ao procedimento atual da requisição.');
      return;
    }

    if (!justification || justification.trim().length < 5) {
      toast.error('Informe a justificativa clínica da alteração (mínimo de 5 caracteres).');
      return;
    }

    try {
      await changeProcedureMutation.mutateAsync({
        id,
        payload: {
          newProcedureId: selectedProcedureId || undefined,
          newProcedureGroupId: selectedGroupId || undefined,
          newType: selectedType,
          justification: justification.trim(),
          adjustedPriority,
          adjustedCid10: adjustedCid10.trim() || undefined,
        },
      });

      navigate('/regulation/inbox');
    } catch {
      // toast de erro disparado pelo hook
    }
  };

  if (isLoadingRequest) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="p-8 text-center text-slate-500">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
          Solicitação não encontrada
        </h2>
        <p className="text-sm mt-1 mb-4">A requisição informada não existe ou foi excluída.</p>
        <Link
          to="/regulation/inbox"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
        >
          Voltar para a Fila de Regulação
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <Link
            to="/regulation/inbox"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400">
                #{request.protocolNumber}
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300">
                {request.status.replace('_', ' ')}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
              Alteração de Procedimento da Requisição
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Substituição e readequação do procedimento clínico pelo médico regulador
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/regulation/inbox"
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
          >
            Voltar à Fila
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* CARD 1: DADOS ATUAIS DA REQUISIÇÃO & DO PACIENTE */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              1. Dados Atuais da Requisição & Paciente
            </span>
            <span className="text-xs text-slate-500">
              Solicitado em {formatDateBR(request.createdAt)}
            </span>
          </div>

          <div className="p-5 sm:p-6 space-y-4">
            {/* Grid Paciente e Origem */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px] uppercase font-bold">Paciente</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm block">
                  {request.patient?.name}
                </span>
                <span className="text-slate-500">CPF: {request.patient?.cpf || 'Não inf.'}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] uppercase font-bold">Unidade Solicitante</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">
                  {request.requestingHealthCenter?.name || 'UBS Solicitante'}
                </span>
                <span className="text-slate-500">
                  Médico: {request.attendingDoctor?.name || request.requestingUser?.name || 'Não inf.'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] uppercase font-bold">Hipótese / CID-10</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm block">
                  {request.cid10 || 'Não inf.'}
                </span>
                <span className="text-slate-500">Prioridade original: {request.priority}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] uppercase font-bold">Status do Agendamento</span>
                {request.status === 'AGENDADA' ? (
                  <span className="text-emerald-600 font-bold block">
                    Agendado para {request.scheduledDate} às {request.scheduledTime}
                  </span>
                ) : (
                  <span className="text-slate-600 dark:text-slate-300 font-medium block">
                    Aguardando vaga na regulação
                  </span>
                )}
                {request.confirmationToken && (
                  <span className="font-mono text-[10px] text-slate-500">
                    Chave: {request.confirmationToken}
                  </span>
                )}
              </div>
            </div>

            {/* Box Procedimento Atual */}
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 block mb-0.5">
                  Procedimento Solicitado Atualmente
                </span>
                <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                    {request.type}
                  </span>
                  <span>{previousProcedureLabel}</span>
                </div>
              </div>
              <span className="text-xs text-slate-500">
                {request.procedure?.requiresRegulation ? 'Regulado pela Central' : 'Acesso Direto'}
              </span>
            </div>

            {/* Justificativa Clínica da UBS */}
            {request.clinicalJustification && (
              <div>
                <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500 block mb-1">
                  Justificativa Clínica do Solicitante (UBS)
                </span>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-xs text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 italic leading-relaxed">
                  "{request.clinicalJustification}"
                </div>
              </div>
            )}

            {/* Documentos Anexados */}
            {request.attachments && request.attachments.length > 0 && (
              <div>
                <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500 block mb-1.5 items-center gap-1">
                  <Paperclip className="w-3.5 h-3.5" /> Laudos e Documentos Anexados ({request.attachments.length})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {request.attachments.map((att) => (
                    <a
                      key={att.id}
                      href={`${apiUrl}${att.fileUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-md text-xs hover:bg-blue-50 dark:hover:bg-blue-900/20 transition group"
                    >
                      <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                        {att.fileName}
                      </span>
                      <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CARD 2: NOVO PROCEDIMENTO PROPOSTO & RECLASSIFICAÇÃO */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-blue-200 dark:border-blue-900/60 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 bg-blue-50/70 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/40 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              2. Seleção do Novo Procedimento & Reclassificação
            </span>
            <span className="text-xs text-blue-700 dark:text-blue-300 font-semibold">
              Revisão Regulatória
            </span>
          </div>

          <div className="p-5 sm:p-6 space-y-5">
            {/* Seletor do Tipo */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Tipo do Novo Procedimento *
              </label>
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-fit">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedType('CONSULTA');
                    setSelectedProcedureId('');
                    setSelectedGroupId('');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                    selectedType === 'CONSULTA'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Stethoscope className="w-3.5 h-3.5" />
                  CONSULTA
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedType('EXAME');
                    setSelectedProcedureId('');
                    setSelectedGroupId('');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                    selectedType === 'EXAME'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  EXAME
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedType('PROCEDIMENTO');
                    setSelectedProcedureId('');
                    setSelectedGroupId('');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                    selectedType === 'PROCEDIMENTO'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Scissors className="w-3.5 h-3.5" />
                  PROCEDIMENTO
                </button>
              </div>
            </div>

            {/* Busca & Seleção do Procedimento */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Novo Procedimento *
                  </label>
                  <div className="relative">
                    <select
                      required
                      value={selectedProcedureId ? `PROC:${selectedProcedureId}` : (selectedGroupId ? `GROUP:${selectedGroupId}` : '')}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) {
                          setSelectedProcedureId('');
                          setSelectedGroupId('');
                          return;
                        }
                        if (val.startsWith('GROUP:')) {
                          setSelectedGroupId(val.replace('GROUP:', ''));
                          setSelectedProcedureId('');
                        } else {
                          setSelectedProcedureId(val.replace('PROC:', ''));
                          setSelectedGroupId('');
                        }
                      }}
                      className="w-full pl-3 pr-10 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 truncate"
                    >
                      <option value="">Selecione o novo procedimento ou grupo...</option>

                      {/* Grupos se aplicável */}
                      {selectedType !== 'CONSULTA' && filteredGroups.length > 0 && (
                        <optgroup label="Grupos de Procedimentos">
                          {filteredGroups.map((g) => (
                            <option key={`GROUP:${g.id}`} value={`GROUP:${g.id}`}>
                              [GRUPO] {g.name}
                            </option>
                          ))}
                        </optgroup>
                      )}

                      {/* Procedimentos Individuais */}
                      <optgroup label={selectedType === 'CONSULTA' ? 'Consultas Médicas' : 'Procedimentos Individuais'}>
                        {filteredProcedures.map((p) => (
                          <option key={`PROC:${p.id}`} value={`PROC:${p.id}`}>
                            {p.code ? `${p.code} - ` : ''}{p.name}
                          </option>
                        ))}
                      </optgroup>
                    </select>

                    {(selectedProcedureId || selectedGroupId) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProcedureId('');
                          setSelectedGroupId('');
                        }}
                        className="absolute right-7 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                        title="Limpar seleção"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Filtro Rápido por Texto */}
                <div className="sm:w-64">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Filtrar lista por nome/código
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Ex: tomografia, 0301..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Comparativo Antes vs Depois */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
              <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500 block mb-2">
                Comparativo de Substituição
              </span>

              <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-center">
                {/* Lado Esquerdo: Anterior */}
                <div className="md:col-span-5 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                    Procedimento Atual (Original)
                  </span>
                  <span className="font-semibold text-xs text-slate-700 dark:text-slate-300 block">
                    {previousProcedureLabel}
                  </span>
                </div>

                {/* Centro: Seta */}
                <div className="md:col-span-1 flex justify-center text-blue-600 dark:text-blue-400">
                  <ArrowRight className="w-5 h-5 hidden md:block" />
                  <span className="md:hidden text-xs font-bold text-blue-600">➔ ALTERADO PARA</span>
                </div>

                {/* Lado Direito: Novo */}
                <div className={`md:col-span-5 p-3 rounded-lg border transition ${
                  selectedProcedureId || selectedGroupId
                    ? 'border-blue-400 bg-blue-50/60 dark:bg-blue-950/40 dark:border-blue-800'
                    : 'border-dashed border-slate-300 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-800/20'
                }`}>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 uppercase font-bold block mb-1">
                    Novo Procedimento Proposto
                  </span>
                  <span className={`font-bold text-xs block ${
                    selectedProcedureId || selectedGroupId
                      ? 'text-blue-900 dark:text-blue-100'
                      : 'text-slate-400 italic'
                  }`}>
                    {newProcedureLabel}
                  </span>
                </div>
              </div>

              {isSameProcedure && (
                <div className="mt-3 p-2 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>O procedimento selecionado é o mesmo já registrado nesta solicitação.</span>
                </div>
              )}
            </div>

            {/* Linha: CID-10 e Reclassificação de Prioridade */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* CID-10 */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  CID-10 da Indicação Clínica
                </label>
                <input
                  type="text"
                  value={adjustedCid10}
                  onChange={(e) => setAdjustedCid10(e.target.value.toUpperCase())}
                  placeholder="Ex: M54.5"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 uppercase font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Ajuste caso a patologia do novo procedimento seja diferente
                </span>
              </div>

              {/* Prioridade */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reclassificação de Prioridade
                </label>
                <select
                  value={adjustedPriority}
                  onChange={(e) => setAdjustedPriority(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ELETIVO">Eletivo (Ordem cronológica)</option>
                  <option value="PRIORITARIO">Prioritário (Quadro agravado)</option>
                  <option value="URGENCIA">Urgência (Risco clínico iminente)</option>
                </select>
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Permite readequar o critério de prioridade do paciente
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 3: JUSTIFICATIVA CLÍNICA E REGULATÓRIA OBRIGATÓRIA */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              3. Justificativa Clínica e Regulatória *
            </span>
            <span className="text-xs text-rose-600 font-semibold">Obrigatória para o Histórico</span>
          </div>

          <div className="p-5 sm:p-6 space-y-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Descreva com clareza o motivo clínico ou regulatório para a alteração do procedimento (ex: laudo de exame anexo indica necessidade de método mais avançado, inadequação técnica da solicitação original, protocolo clínico municipal).
            </p>

            <textarea
              required
              rows={4}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Digite a justificativa detalhada da alteração de procedimento para registro no prontuário e histórico de regulação..."
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
            />

            <div className="p-3 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-lg text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Atenção:</strong> Esta justificativa, juntamente com o procedimento anterior e o novo procedimento, será registrada de forma <strong>indelével na Trilha de Auditoria e Histórico da Requisição</strong> com seu nome de médico regulador. Caso a requisição já estivesse agendada, o agendamento anterior será liberado para reagendamento seguro.
              </span>
            </div>
          </div>
        </div>

        {/* CARD 4: TRILHA DE AUDITORIA & HISTÓRICO ATUAL */}
        {request.statusHistory && request.statusHistory.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4 text-blue-500" />
                Histórico Existente da Requisição ({request.statusHistory.length} registros)
              </span>
            </div>

            <div className="p-5 sm:p-6">
              <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
                {request.statusHistory.map((hist, idx) => {
                  const isProcChange = hist.justification.startsWith('ALTERAÇÃO DE PROCEDIMENTO:');
                  const statusMeta = getRegulationStatusMeta(hist.newStatus);

                  return (
                    <div key={hist.id || idx} className="relative pl-7 text-xs">
                      <div
                        className={`absolute left-1.5 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${
                          isProcChange ? 'bg-indigo-600' : statusMeta.dotClass
                        }`}
                      />

                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        {isProcChange ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 flex items-center gap-1">
                            <ArrowRightLeft className="w-3 h-3" /> Alteração de Procedimento
                          </span>
                        ) : (
                          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${statusMeta.badgeClass}`}>
                            {getStatusHistoryEventLabel(hist)}
                          </span>
                        )}

                        <span className="text-[11px] text-slate-400">
                          {formatDateTimeBR(hist.createdAt)}
                        </span>

                        {hist.actionByUser && (
                          <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                            por {hist.actionByUser.name}
                          </span>
                        )}
                      </div>

                      <div className={`mt-1 p-2 rounded-md border text-slate-700 dark:text-slate-300 text-xs italic ${
                        isProcChange
                          ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900/50 font-medium not-italic'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800'
                      }`}>
                        {hist.justification}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* FOOTER ACTIONS */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-slate-200 dark:border-slate-800">
          <Link
            to="/regulation/inbox"
            className="w-full sm:w-auto px-5 py-2.5 text-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold text-xs uppercase tracking-wide transition"
          >
            Cancelar
          </Link>

          <button
            type="submit"
            disabled={changeProcedureMutation.isPending || isSameProcedure || (!selectedProcedureId && !selectedGroupId)}
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm uppercase tracking-wide shadow-sm hover:shadow transition-all duration-200 cursor-pointer active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {changeProcedureMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Salvando Alteração...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Salvar Alteração de Procedimento</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

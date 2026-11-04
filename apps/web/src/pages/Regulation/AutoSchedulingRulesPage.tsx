import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sliders,
  Plus,
  ArrowLeft,
  Edit2,
  Trash2,
  X,
  Save,
  Loader2,
} from 'lucide-react';
import {
  useAutoSchedulingRules,
  useCreateAutoSchedulingRule,
  useUpdateAutoSchedulingRule,
  useDeleteAutoSchedulingRule,
} from '../../hooks/useAutoScheduling';
import { useProcedures, useProcedureGroups } from '../../hooks/useProcedures';
import type { AutoSchedulingRule } from '../../services/autoScheduling';
import { toast } from 'sonner';

export const AutoSchedulingRulesPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: rules = [], isLoading, refetch } = useAutoSchedulingRules();
  const { data: proceduresData } = useProcedures({ page: 1, limit: 300 });
  const { data: procedureGroupsData = [] } = useProcedureGroups();

  const createRuleMutation = useCreateAutoSchedulingRule();
  const updateRuleMutation = useUpdateAutoSchedulingRule();
  const deleteRuleMutation = useDeleteAutoSchedulingRule();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutoSchedulingRule | null>(null);

  // Form State
  const [ruleName, setRuleName] = useState('');
  const [targetType, setTargetType] = useState<'GLOBAL' | 'PROCEDURE' | 'GROUP'>('GLOBAL');
  const [selectedProcedureId, setSelectedProcedureId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [weightWaitingDays, setWeightWaitingDays] = useState(1);
  const [weightPriorityUrgency, setWeightPriorityUrgency] = useState(500);
  const [weightPriorityPriority, setWeightPriorityPriority] = useState(200);
  const [weightElderly80Plus, setWeightElderly80Plus] = useState(300);
  const [weightElderly60Plus, setWeightElderly60Plus] = useState(100);
  const [minLeadTimeDays, setMinLeadTimeDays] = useState(3);
  const [maxScheduleHorizonDays, setMaxScheduleHorizonDays] = useState(60);
  const [respectHealthCenterQuotas, setRespectHealthCenterQuotas] = useState(true);
  const [allowAutoExecution, setAllowAutoExecution] = useState(true);

  const openCreateModal = () => {
    setEditingRule(null);
    setRuleName('');
    setTargetType('GLOBAL');
    setSelectedProcedureId('');
    setSelectedGroupId('');
    setIsActive(true);
    setWeightWaitingDays(1);
    setWeightPriorityUrgency(500);
    setWeightPriorityPriority(200);
    setWeightElderly80Plus(300);
    setWeightElderly60Plus(100);
    setMinLeadTimeDays(3);
    setMaxScheduleHorizonDays(60);
    setRespectHealthCenterQuotas(true);
    setAllowAutoExecution(true);
    setModalOpen(true);
  };

  const openEditModal = (rule: AutoSchedulingRule) => {
    setEditingRule(rule);
    setRuleName(rule.ruleName);
    if (rule.procedureId) {
      setTargetType('PROCEDURE');
      setSelectedProcedureId(rule.procedureId);
      setSelectedGroupId('');
    } else if (rule.procedureGroupId) {
      setTargetType('GROUP');
      setSelectedGroupId(rule.procedureGroupId);
      setSelectedProcedureId('');
    } else {
      setTargetType('GLOBAL');
      setSelectedProcedureId('');
      setSelectedGroupId('');
    }
    setIsActive(rule.isActive);
    setWeightWaitingDays(rule.weightWaitingDays);
    setWeightPriorityUrgency(rule.weightPriorityUrgency);
    setWeightPriorityPriority(rule.weightPriorityPriority);
    setWeightElderly80Plus(rule.weightElderly80Plus);
    setWeightElderly60Plus(rule.weightElderly60Plus);
    setMinLeadTimeDays(rule.minLeadTimeDays);
    setMaxScheduleHorizonDays(rule.maxScheduleHorizonDays);
    setRespectHealthCenterQuotas(rule.respectHealthCenterQuotas);
    setAllowAutoExecution(rule.allowAutoExecution);
    setModalOpen(true);
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ruleName.trim()) {
      toast.error('Informe o nome da regra.');
      return;
    }

    if (targetType === 'PROCEDURE' && !selectedProcedureId) {
      toast.error('Selecione o procedimento para esta regra.');
      return;
    }

    if (targetType === 'GROUP' && !selectedGroupId) {
      toast.error('Selecione o grupo de procedimentos para esta regra.');
      return;
    }

    const payload = {
      ruleName: ruleName.trim(),
      procedureId: targetType === 'PROCEDURE' ? selectedProcedureId : undefined,
      procedureGroupId: targetType === 'GROUP' ? selectedGroupId : undefined,
      isActive,
      weightWaitingDays: Number(weightWaitingDays),
      weightPriorityUrgency: Number(weightPriorityUrgency),
      weightPriorityPriority: Number(weightPriorityPriority),
      weightElderly80Plus: Number(weightElderly80Plus),
      weightElderly60Plus: Number(weightElderly60Plus),
      minLeadTimeDays: Number(minLeadTimeDays),
      maxScheduleHorizonDays: Number(maxScheduleHorizonDays),
      respectHealthCenterQuotas,
      allowAutoExecution,
    };

    try {
      if (editingRule) {
        await updateRuleMutation.mutateAsync({ id: editingRule.id, dto: payload });
      } else {
        await createRuleMutation.mutateAsync(payload);
      }
      setModalOpen(false);
      refetch();
    } catch {
      // toast disparado pelo hook
    }
  };

  const handleDeleteRule = async (id: string, name: string) => {
    if (confirm(`Deseja realmente excluir a regra "${name}"?`)) {
      await deleteRuleMutation.mutateAsync(id);
      refetch();
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/regulation/waiting-list')}
            className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
            title="Voltar para a Fila de Espera"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-6 h-6 text-blue-600" />
              <span>Regras de Agendamento Automático</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Defina os pesos de ranqueamento por tempo de espera, prioridade clínica e parâmetros de alocação de vagas.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-98"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Regra de Agendamento</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 text-xs font-bold">
        <Link
          to="/regulation/inbox"
          className="px-3 py-1.5 rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          Inbox da Regulação (Triagem)
        </Link>
        <Link
          to="/regulation/waiting-list"
          className="px-3 py-1.5 rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          Fila de Espera Autorizada
        </Link>
        <span className="px-3 py-1.5 rounded-md bg-blue-600 text-white">
          Parâmetros de Agendamento Automático ({rules.length})
        </span>
      </div>

      {/* Listagem das Regras */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-500 text-xs">
          Carregando regras de agendamento automático...
        </div>
      ) : rules.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
          <Sliders className="w-10 h-10 mx-auto text-slate-400 stroke-1" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">Nenhuma regra cadastrada</h3>
          <p className="text-xs text-slate-500">
            Cadastre uma regra padrão municipal ou regras específicas para especialidades.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rules.map((rule) => {
            const isGlobal = !rule.procedureId && !rule.procedureGroupId;

            return (
              <div
                key={rule.id}
                className={`p-5 rounded-xl border bg-white dark:bg-slate-900 shadow-xs space-y-4 transition ${
                  rule.isActive
                    ? 'border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-700'
                    : 'border-slate-200 dark:border-slate-800 opacity-60'
                }`}
              >
                {/* Topo do Card */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                        {rule.ruleName}
                      </h3>
                      {rule.isActive ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                          Ativa
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          Inativa
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 block mt-1">
                      {isGlobal
                        ? '★ Aplicação Geral no Município (Regra Padrão)'
                        : rule.procedure
                        ? `Procedimento: ${rule.procedure.code ? rule.procedure.code + ' - ' : ''}${rule.procedure.name}`
                        : `Grupo: ${rule.procedureGroup?.name}`}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(rule)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition cursor-pointer"
                      title="Editar Regra"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {!isGlobal && (
                      <button
                        type="button"
                        onClick={() => handleDeleteRule(rule.id, rule.ruleName)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition cursor-pointer"
                        title="Excluir Regra"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Grid de Pesos de Pontuação */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Tempo de Espera:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      +{rule.weightWaitingDays} ponto(s) / dia
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Prioridade Urgência:</span>
                    <span className="font-mono font-bold text-red-600 dark:text-red-400">
                      +{rule.weightPriorityUrgency} pontos
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Prioridade Clínica:</span>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                      +{rule.weightPriorityPriority} pontos
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Superprioridade (80+):</span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      +{rule.weightElderly80Plus} pontos
                    </span>
                  </div>
                </div>

                {/* Parâmetros Operacionais */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span>Antecedência Mínima (Lead Time):</span>
                    <strong className="text-slate-800 dark:text-slate-200">
                      {rule.minLeadTimeDays} dias úteis
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Horizonte Máximo de Agendamento:</span>
                    <strong className="text-slate-800 dark:text-slate-200">
                      {rule.maxScheduleHorizonDays} dias futuros
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Respeitar Cotas Mensais da UBS:</span>
                    <strong className={rule.respectHealthCenterQuotas ? 'text-emerald-600' : 'text-slate-400'}>
                      {rule.respectHealthCenterQuotas ? 'Sim' : 'Não'}
                    </strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Criação / Edição de Regra */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50">
              <div className="flex items-center space-x-2.5">
                <Sliders className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingRule ? 'Editar Regra de Agendamento' : 'Nova Regra de Agendamento Automático'}
                </h2>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="p-6 space-y-5 text-xs">
              {/* Nome da Regra */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Nome Identificador da Regra *
                </label>
                <input
                  type="text"
                  required
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  placeholder="Ex: Regra Padrão de Consultas Médicas"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Aplicação da Regra */}
              <div className="space-y-3">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Aplicação da Regra *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetType('GLOBAL')}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                      targetType === 'GLOBAL'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600'
                    }`}
                  >
                    Geral (Municipal)
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetType('PROCEDURE')}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                      targetType === 'PROCEDURE'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600'
                    }`}
                  >
                    Procedimento Específico
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetType('GROUP')}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                      targetType === 'GROUP'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600'
                    }`}
                  >
                    Grupo de Procedimentos
                  </button>
                </div>

                {targetType === 'PROCEDURE' && (
                  <div>
                    <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Selecione o Procedimento:
                    </label>
                    <select
                      value={selectedProcedureId}
                      onChange={(e) => setSelectedProcedureId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Selecione um procedimento...</option>
                      {proceduresData?.data?.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.code ? `${p.code} - ` : ''}{p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {targetType === 'GROUP' && (
                  <div>
                    <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Selecione o Grupo:
                    </label>
                    <select
                      value={selectedGroupId}
                      onChange={(e) => setSelectedGroupId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Selecione um grupo...</option>
                      {procedureGroupsData.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Seção de Pesos de Pontuação */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <span className="font-bold text-slate-800 dark:text-white block uppercase tracking-wider text-[11px]">
                  Pesos do Algoritmo de Ranqueamento (Score)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-slate-600 dark:text-slate-400 block mb-1">
                      Pontos por Dia de Espera na Fila:
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={weightWaitingDays}
                      onChange={(e) => setWeightWaitingDays(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-slate-600 dark:text-slate-400 block mb-1">
                      Bônus Prioridade URGÊNCIA:
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={weightPriorityUrgency}
                      onChange={(e) => setWeightPriorityUrgency(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-xs font-bold text-red-600"
                    />
                  </div>

                  <div>
                    <label className="text-slate-600 dark:text-slate-400 block mb-1">
                      Bônus Prioridade PRIORITÁRIO:
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={weightPriorityPriority}
                      onChange={(e) => setWeightPriorityPriority(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-xs font-bold text-amber-600"
                    />
                  </div>

                  <div>
                    <label className="text-slate-600 dark:text-slate-400 block mb-1">
                      Superprioridade Idosos (80+ anos):
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={weightElderly80Plus}
                      onChange={(e) => setWeightElderly80Plus(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-xs font-bold text-indigo-600"
                    />
                  </div>
                </div>
              </div>

              {/* Parâmetros Operacionais */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Antecedência Mínima (Lead Time em dias úteis):
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={minLeadTimeDays}
                    onChange={(e) => setMinLeadTimeDays(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-xs"
                  />
                  <span className="text-[10px] text-slate-400">Tempo para entrega da filipeta pela UBS ao paciente.</span>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Horizonte Máximo de Agendamento (dias futuros):
                  </label>
                  <input
                    type="number"
                    min={7}
                    max={180}
                    value={maxScheduleHorizonDays}
                    onChange={(e) => setMaxScheduleHorizonDays(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-xs"
                  />
                </div>
              </div>

              {/* Checkboxes de Parâmetros */}
              <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={respectHealthCenterQuotas}
                    onChange={(e) => setRespectHealthCenterQuotas(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Respeitar o saldo de cotas mensais pactuadas da UBS solicitante
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Regra Ativa no Motor de Agendamento
                  </span>
                </label>
              </div>

              {/* Botões do Rodapé */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={createRuleMutation.isPending || updateRuleMutation.isPending}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  {createRuleMutation.isPending || updateRuleMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{editingRule ? 'Salvar Alterações' : 'Criar Regra'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

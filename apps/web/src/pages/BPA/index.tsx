import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  FileSpreadsheet,
  Download,
  FileText,
  Printer,
  ShieldCheck,
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  Trash2,
  Loader2,
  UserCheck,
  Search,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useBpaRecords, useBpaBatches, useBpaActions } from '../../hooks/useBpa';
import { formatDateBR, formatDateTimeBR, formatCPF, formatCNS } from '../../utils/brazilianFormatters';
import { toast } from 'sonner';

const apiUrl = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000';

export default function BpaPage() {
  const { user, permissions, activeProfile, token } = useAuthStore();
  const isAdmin = permissions?.includes('admin:access') || activeProfile?.name === 'Administrador';
  const isCoordinator = activeProfile?.name === 'Coordenador de Unidade';

  // 1. Estados de Filtros
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [selectedUnitId, setSelectedUnitId] = useState<string>(() => {
    if (isCoordinator && user?.healthCenterId) return user.healthCenterId;
    return '';
  });

  const [patientIdType, setPatientIdType] = useState<'CPF' | 'CNS'>('CPF');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'current' | 'batches'>('current');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // 2. Busca de Unidades de Saúde autorizadas para o usuário no módulo BPA
  const { data: unitsRaw } = useQuery<{ id: string; name: string; cnes: string }[]>({
    queryKey: ['bpa-units-list'],
    queryFn: async () => {
      const res = await axios.get(`${apiUrl}/bpa/units`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    },
    enabled: Boolean(token),
  });

  const units = useMemo<{ id: string; name: string; cnes: string }[]>(() => {
    if (Array.isArray(unitsRaw)) return unitsRaw;
    if (Array.isArray((unitsRaw as any)?.data)) return (unitsRaw as any).data;
    return [];
  }, [unitsRaw]);

  // Lista dos últimos 24 meses
  const availableMonths = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 24; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      months.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return months;
  }, []);

  // Identifica se o mês já está fechado (anterior ao mês corrente)
  const isMonthClosed = useMemo(() => {
    if (!selectedMonth) return false;
    const [yStr, mStr] = selectedMonth.split('-');
    const selectedDate = new Date(parseInt(yStr, 10), parseInt(mStr, 10) - 1, 1);
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return selectedDate < currentMonth;
  }, [selectedMonth]);

  // 3. Consultas dos Dados
  const effectiveUnit = isCoordinator ? user?.healthCenterId : selectedUnitId;

  const {
    data: bpaData,
    isLoading: isLoadingRecords,
    refetch: refetchRecords,
  } = useBpaRecords({
    competencia: selectedMonth,
    unitId: effectiveUnit || undefined,
    patientIdType,
  });

  const {
    data: batches = [],
    isLoading: isLoadingBatches,
    refetch: refetchBatches,
  } = useBpaBatches({
    competencia: selectedMonth,
    unitId: effectiveUnit || undefined,
  });

  const {
    exportTxt,
    isExportingTxt,
    exportPdf,
    isExportingPdf,
    createBatch,
    isCreatingBatch,
    downloadBatch,
    deleteBatch,
    isDeletingBatch,
  } = useBpaActions();

  // Atendimentos filtrados por busca textual
  const filteredRecords = useMemo(() => {
    const list = bpaData?.records || [];
    if (!searchTerm.trim()) return list;
    const term = searchTerm.toLowerCase();
    return list.filter(
      (r) =>
        r.nomePaciente?.toLowerCase().includes(term) ||
        r.cpfPaciente?.includes(term) ||
        r.cnsPaciente?.includes(term) ||
        r.nomeProfissional?.toLowerCase().includes(term) ||
        r.procedimento?.includes(term)
    );
  }, [bpaData?.records, searchTerm]);

  // Ações de Exportação
  const handleExportTxt = async () => {
    if (!bpaData?.records || bpaData.records.length === 0) {
      toast.warning('Não há atendimentos para exportar na competência selecionada.');
      return;
    }
    const unitTarget = effectiveUnit || units[0]?.id || '';
    await exportTxt({
      competencia: selectedMonth,
      unitId: unitTarget,
      records: bpaData.records,
    });
  };

  const handleExportPdf = async () => {
    if (!bpaData?.records || bpaData.records.length === 0) {
      toast.warning('Não há atendimentos para gerar o formulário impresso.');
      return;
    }
    const currentUnitObj = units.find((u) => u.id === effectiveUnit);
    await exportPdf({
      records: bpaData.records,
      competencia: selectedMonth,
      unit: currentUnitObj?.name || 'ESTABELECIMENTO DE SAÚDE',
    });
  };

  const handleFreezeBatch = async () => {
    if (!bpaData?.records || bpaData.records.length === 0) {
      toast.warning('Não há atendimentos para arquivar no lote oficial.');
      return;
    }

    const confirmAction = window.confirm(
      `Deseja congelar e salvar o Lote Oficial de Produção da competência ${selectedMonth} com ${bpaData.records.length} atendimentos?\n\nEsta ação gera uma cópia oficial com assinatura criptográfica SHA-256 no banco de dados para auditoria do gestor.`
    );
    if (!confirmAction) return;

    try {
      const unitTarget = effectiveUnit || units[0]?.id || '';
      const txtResult = await axios.post(
        `${apiUrl}/bpa/export-txt`,
        {
          competencia: selectedMonth,
          unitId: unitTarget,
          records: bpaData.records,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await createBatch({
        competencia: selectedMonth,
        unitId: unitTarget,
        totalRecords: bpaData.records.length,
        fileContent: txtResult.data.fileContent,
        metadata: {
          patientIdType,
          totalWithCpf: bpaData.summary.withCpf,
          totalWithCns: bpaData.summary.withCns,
          exportedBy: user?.name,
          generatedAt: new Date().toISOString(),
        },
      });
      setActiveTab('batches');
    } catch {
      toast.error('Erro ao processar o arquivamento do lote oficial.');
    }
  };

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2500);
    toast.info('Hash SHA-256 copiado para a área de transferência.');
  };

  const handleDeleteBatch = async (batchId: string) => {
    if (!window.confirm('Tem certeza de que deseja excluir definitivamente este lote oficial arquivado?')) return;
    await deleteBatch(batchId);
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-2xs font-bold uppercase tracking-wider bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Faturamento Ambulatorial SUS
            </span>
            {isMonthClosed ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="w-3 h-3" />
                Competência Fechada
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                <AlertTriangle className="w-3 h-3" />
                Mês Corrente (Em Aberto)
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Boletim de Produção Ambulatorial (BPA-I)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Geração do arquivo magnético padrão DATASUS e formulário impresso oficial do Ministério da Saúde com base nos atendimentos dos profissionais cadastrados.
          </p>
        </div>

        {/* Botões de Ação Global */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportTxt}
            disabled={isExportingTxt || !bpaData?.records?.length}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-900 hover:bg-black dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Exportar arquivo magnético .TXT para importação no BPA Magnético"
          >
            {isExportingTxt ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4 text-emerald-400" />}
            <span>Exportar TXT Oficial</span>
          </button>

          <button
            onClick={handleExportPdf}
            disabled={isExportingPdf || !bpaData?.records?.length}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-[#0051A2] hover:bg-[#003B77] text-white rounded-xl text-xs font-semibold transition shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Exportar formulário oficial impresso BPA-I (3 atendimentos por página)"
          >
            {isExportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4 text-blue-200" />}
            <span>Exportar Formulário PDF</span>
          </button>

          <button
            onClick={handleFreezeBatch}
            disabled={isCreatingBatch || !bpaData?.records?.length}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Congelar e arquivar lote no banco com assinatura digital SHA-256"
          >
            {isCreatingBatch ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            <span>Congelar Lote Oficial</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Competência */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            Competência (Mês/Ano)
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          >
            {availableMonths.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label} ({m.value})
              </option>
            ))}
          </select>
        </div>

        {/* Estabelecimento de Saúde */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            Estabelecimento Executante
          </label>
          {isCoordinator ? (
            <div className="text-xs font-semibold px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 truncate">
              {units.find((u) => u.id === user?.healthCenterId)?.name || 'Sua Unidade de Saúde'}
              <span className="block text-[10px] text-blue-600 dark:text-blue-400 font-normal mt-0.5">
                (Unidade vinculada ao seu perfil)
              </span>
            </div>
          ) : (
            <select
              value={selectedUnitId}
              onChange={(e) => setSelectedUnitId(e.target.value)}
              className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            >
              <option value="">Todas as Unidades (Consolidado Municipal)</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} (CNES: {u.cnes})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Prioridade do Identificador do Paciente */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            Identificador do Paciente
          </label>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setPatientIdType('CPF')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                patientIdType === 'CPF'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              CPF Prioritário
            </button>
            <button
              type="button"
              onClick={() => setPatientIdType('CNS')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                patientIdType === 'CNS'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              CNS Prioritário
            </button>
          </div>
        </div>

        {/* Busca Rápida na Tabela */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            Filtrar na Lista
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Nome, CPF, CNS ou Médico..."
            className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Cards de Métricas e Diagnóstico de Conformidade */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <p className="text-2xs font-bold uppercase tracking-wider text-slate-400">Total Atendimentos</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {isLoadingRecords ? '...' : bpaData?.total || 0}
            </span>
            <span className="text-xs text-slate-500">atendimentos</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <p className="text-2xs font-bold uppercase tracking-wider text-slate-400">Identificação Válida</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">
              {isLoadingRecords ? '...' : (bpaData?.summary?.withCpf || 0) + (bpaData?.summary?.withCns || 0)}
            </span>
            <span className="text-xs text-slate-500">
              ({bpaData?.summary?.withCpf || 0} CPF / {bpaData?.summary?.withCns || 0} CNS)
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <p className="text-2xs font-bold uppercase tracking-wider text-slate-400">Inconsistências Clínicas</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
              {isLoadingRecords ? '...' : bpaData?.summary?.withoutCid || 0}
            </span>
            <span className="text-xs text-slate-500">sem CID-10 explícito</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <p className="text-2xs font-bold uppercase tracking-wider text-slate-400">Lotes Oficiais Salvos</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {isLoadingBatches ? '...' : batches.length}
            </span>
            <span className="text-xs text-slate-500">arquivados</span>
          </div>
        </div>
      </div>

      {/* Abas de Navegação (Underline Tabs) */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex items-center gap-6">
        <button
          type="button"
          onClick={() => setActiveTab('current')}
          className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'current'
              ? 'border-[#0051A2] text-[#0051A2] dark:text-blue-400 dark:border-blue-500'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Atendimentos Elegíveis ({filteredRecords.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('batches')}
          className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'batches'
              ? 'border-[#0051A2] text-[#0051A2] dark:text-blue-400 dark:border-blue-500'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Lotes Oficiais Arquivados ({batches.length})</span>
        </button>
      </div>

      {/* Conteúdo da Aba 1: Tabela de Atendimentos */}
      {activeTab === 'current' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Espelho da Produção Ambulatorial do Período
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Registros individuais que compõem o arquivo magnético e o formulário oficial impresso.
              </p>
            </div>
            <button
              onClick={() => refetchRecords()}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline self-start sm:self-auto"
            >
              Atualizar Dados
            </button>
          </div>

          {isLoadingRecords ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="text-xs">Carregando produção ambulatorial...</span>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Nenhum atendimento médico finalizado encontrado para os filtros selecionados.
              </p>
              <p className="text-2xs text-slate-400 mt-1">
                Verifique se há prontuários registrados na competência ou altere a unidade executante.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-2xs uppercase tracking-wider text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Paciente</th>
                    <th className="px-4 py-3">Identificador</th>
                    <th className="px-4 py-3">Procedimento SIGTAP</th>
                    <th className="px-4 py-3">Profissional / CBO</th>
                    <th className="px-4 py-3">CID-10</th>
                    <th className="px-4 py-3">Unidade Executante</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredRecords.map((r, idx) => (
                    <tr key={r.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                        {formatDateBR(r.dataAtendimento)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-800 dark:text-slate-100 block truncate max-w-[200px]">
                          {r.nomePaciente}
                        </span>
                        <span className="text-2xs text-slate-400">
                          Nasc: {formatDateBR(r.dataNascimento)} ({r.idade} anos)
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-2xs">
                        {r.cpfPaciente ? (
                          <span className="text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded">
                            CPF: {formatCPF(r.cpfPaciente)}
                          </span>
                        ) : r.cnsPaciente ? (
                          <span className="text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/40 px-2 py-0.5 rounded">
                            CNS: {formatCNS(r.cnsPaciente)}
                          </span>
                        ) : (
                          <span className="text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/40 px-2 py-0.5 rounded">
                            Sem Doc.
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100 block">
                          {r.procedimento}
                        </span>
                        <span className="text-2xs text-slate-500 dark:text-slate-400 truncate block max-w-[220px]">
                          {r.procedimentoNome || 'CONSULTA MEDICA EM ATENCAO ESPECIALIZADA'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate max-w-[180px]">
                          {r.nomeProfissional}
                        </span>
                        <span className="text-2xs font-mono text-slate-400">CBO: {r.cboProfissional}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                          {r.cid || 'R69'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="block truncate max-w-[160px] font-medium text-slate-700 dark:text-slate-300">
                          {r.nomeEstabelecimento}
                        </span>
                        <span className="text-2xs font-mono text-slate-400">CNES: {r.cnes}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Conteúdo da Aba 2: Lotes Oficiais Arquivados */}
      {activeTab === 'batches' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Lotes Oficiais Congelados & Assinados
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Histórico de arquivos oficiais gerados para importação no SIA-SUS com assinatura criptográfica SHA-256.
              </p>
            </div>
            <button
              onClick={() => refetchBatches()}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Atualizar Lotes
            </button>
          </div>

          {isLoadingBatches ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="text-xs">Carregando histórico de lotes...</span>
            </div>
          ) : batches.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Nenhum lote oficial foi congelado ou arquivado nesta competência.
              </p>
              <p className="text-2xs text-slate-400 mt-1">
                Utilize o botão "Congelar Lote Oficial" na aba de atendimentos para salvar uma cópia auditável.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-2xs uppercase tracking-wider text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Competência</th>
                    <th className="px-4 py-3">Unidade Executante</th>
                    <th className="px-4 py-3">Atendimentos</th>
                    <th className="px-4 py-3">Arquivado em</th>
                    <th className="px-4 py-3">Responsável</th>
                    <th className="px-4 py-3">Assinatura SHA-256</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {batches.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                      <td className="px-4 py-3 font-bold font-mono text-slate-900 dark:text-white">
                        {b.competencia}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate max-w-[200px]">
                          {b.healthCenter?.name || 'Unidade de Saúde'}
                        </span>
                        <span className="text-2xs font-mono text-slate-400">
                          CNES: {b.healthCenter?.cnes || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                        {b.totalRecords} reg.
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-2xs text-slate-500">
                        {formatDateTimeBR(b.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-2xs text-slate-600 dark:text-slate-300">
                        {b.createdBy?.name || 'Sistema'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 font-mono text-2xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md max-w-[190px]">
                          <span className="truncate" title={b.sha256Hash}>
                            {b.sha256Hash}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyHash(b.sha256Hash)}
                            className="p-0.5 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer"
                            title="Copiar Hash SHA-256"
                          >
                            {copiedHash === b.sha256Hash ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => downloadBatch(b)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg text-2xs font-bold transition cursor-pointer"
                            title="Baixar arquivo oficial arquivado .TXT"
                          >
                            <Download className="w-3 h-3" />
                            <span>Baixar</span>
                          </button>

                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDeleteBatch(b.id)}
                              disabled={isDeletingBatch}
                              className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 rounded-lg transition cursor-pointer"
                              title="Excluir Lote Arquivado"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

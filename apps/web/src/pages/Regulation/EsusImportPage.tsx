import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Database,
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  StopCircle,
  FileText,
  ShieldAlert,
  Terminal,
  Activity,
  Sparkles,
} from 'lucide-react';
import {
  useEsusConfig,
  useEsusImportJobs,
  useRunEsusImport,
} from '../../hooks/useEsusImport';
import {
  esusImportService,
  type EsusPreviewResult,
} from '../../services/esusImport';
import { toast } from 'sonner';

export const EsusImportPage: React.FC = () => {
  const { data: config, isLoading: isConfigLoading } = useEsusConfig();
  const { data: jobs = [], isLoading: isJobsLoading } = useEsusImportJobs();
  const {
    isRunning,
    progress,
    totals,
    logs,
    startImport,
    cancelImport,
  } = useRunEsusImport();

  // Form State
  const [startDate, setStartDate] = useState('2025-05-01');
  const [endDate, setEndDate] = useState('2026-11-03');
  const [batchSize, setBatchSize] = useState<number>(2500);

  // Preview State
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<EsusPreviewResult | null>(null);

  // Executa o diagnóstico prévio
  const handleRunPreview = async () => {
    if (!config) {
      toast.error('Configurações de integração não carregadas.');
      return;
    }
    if (!startDate || !endDate) {
      toast.error('Informe as datas inicial e final.');
      return;
    }

    setIsPreviewLoading(true);
    try {
      const res = await esusImportService.fetchPreview(config, startDate, endDate);
      setPreviewResult(res);
      toast.success(
        `Diagnóstico concluído! ${res.totalHits.toLocaleString('pt-BR')} registros e ${res.eligibleRequestsCount.toLocaleString('pt-BR')} solicitações elegíveis localizadas.`,
      );
    } catch (err: any) {
      toast.error(err.message || 'Falha ao consultar o e-SUS Regulação.');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleStartImport = () => {
    if (!config || !previewResult) return;
    startImport({
      config,
      startDate,
      endDate,
      previewResult,
      batchSize,
    });
  };

  const setPreset = (preset: 'DEFAULT' | '12_MONTHS' | '6_MONTHS' | '30_DAYS') => {
    const today = new Date();
    const endStr = today.toISOString().split('T')[0];

    if (preset === 'DEFAULT') {
      setStartDate('2025-05-01');
      setEndDate('2026-11-03');
    } else if (preset === '12_MONTHS') {
      const past = new Date();
      past.setFullYear(today.getFullYear() - 1);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(endStr);
    } else if (preset === '6_MONTHS') {
      const past = new Date();
      past.setMonth(today.getMonth() - 6);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(endStr);
    } else if (preset === '30_DAYS') {
      const past = new Date();
      past.setDate(today.getDate() - 30);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(endStr);
    }
    setPreviewResult(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
            Concluído
          </span>
        );
      case 'RUNNING':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 flex items-center gap-1 animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin" /> Em Execução
          </span>
        );
      case 'FAILED':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300">
            Falha
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 flex items-center gap-1">
              <Database className="w-3 h-3" /> Ministério da Saúde
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Integração OpenSearch</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-1 flex items-center gap-2">
            <span>Importação de Dados do e-SUS Regulação</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Ingestão completa de solicitações pendentes e deduplicação de pacientes vivos diretamente da Central do e-SUS.
          </p>
        </div>

        {/* Links Rápidos */}
        <div className="flex items-center gap-2">
          <Link
            to="/regulation/waiting-list"
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xs transition flex items-center gap-1.5"
          >
            <Users className="w-4 h-4 text-blue-500" />
            <span>Fila de Espera</span>
          </Link>
          <Link
            to="/regulation/inbox"
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xs transition flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4 text-slate-500" />
            <span>Inbox da Regulação</span>
          </Link>
        </div>
      </div>

      {/* Informativo de Conexão Segura & Client-Side */}
      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800/80 rounded-xl flex items-start gap-3">
        <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 dark:text-blue-200 space-y-1">
          <div className="font-bold">Ponte Segura de Ingestão via Navegador (Client-Side Bridge)</div>
          <p className="leading-relaxed opacity-90">
            As requisições ao e-SUS Regulação são processadas diretamente pelo seu navegador para evitar o bloqueio automático de firewall do Ministério da Saúde para faixas de IP de datacenters/VPSs. Os lotes de registros são baixados e persistidos de forma segura e transacional no PostgreSQL do SINPeP.
          </p>
        </div>
      </div>

      {/* Painel 1: Configuração do Período e Parâmetros */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              1. Selecionar Período de Marcação (`dtMarcacao`)
            </h2>
          </div>
          {config && (
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
              Município: {config.cityName} ({config.cityCode})
            </span>
          )}
        </div>

        {/* Atalhos Rápidos */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Períodos rápidos:</span>
          <button
            type="button"
            onClick={() => setPreset('DEFAULT')}
            className={`px-2.5 py-1 text-xs rounded-md font-medium border transition cursor-pointer ${
              startDate === '2025-05-01' && endDate === '2026-11-03'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            Padrão e-SUS (05/2025 a 11/2026)
          </button>
          <button
            type="button"
            onClick={() => setPreset('12_MONTHS')}
            className="px-2.5 py-1 text-xs rounded-md font-medium bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            Últimos 12 meses
          </button>
          <button
            type="button"
            onClick={() => setPreset('6_MONTHS')}
            className="px-2.5 py-1 text-xs rounded-md font-medium bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            Últimos 6 meses
          </button>
          <button
            type="button"
            onClick={() => setPreset('30_DAYS')}
            className="px-2.5 py-1 text-xs rounded-md font-medium bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            Últimos 30 dias
          </button>
        </div>

        {/* Inputs de Data e Tamanho de Lote */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Data Inicial
            </label>
            <input
              type="date"
              value={startDate}
              disabled={isRunning}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPreviewResult(null);
              }}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Data Final
            </label>
            <input
              type="date"
              value={endDate}
              disabled={isRunning}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPreviewResult(null);
              }}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tamanho do Lote (Batch Size)
            </label>
            <select
              value={batchSize}
              disabled={isRunning}
              onChange={(e) => setBatchSize(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
            >
              <option value={2500}>2.500 registros por envio (Recomendado)</option>
              <option value={5000}>5.000 registros por envio (Mais Rápido)</option>
              <option value={1000}>1.000 registros por envio (Conexões Lentas)</option>
            </select>
          </div>
        </div>

        {/* Botão de Diagnóstico / Prévia */}
        <div className="pt-2 flex items-center justify-end">
          <button
            type="button"
            disabled={isPreviewLoading || isRunning || isConfigLoading}
            onClick={handleRunPreview}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-lg text-xs font-bold transition flex items-center gap-2 shadow-sm cursor-pointer"
          >
            {isPreviewLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Consultando OpenSearch...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Analisar & Pré-visualizar Dados do Período</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Painel 2: Dashboard de Diagnóstico & Prévia */}
      {previewResult && !isRunning && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-5 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>2. Diagnóstico Pré-Importação Concluído</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Resumo dos dados encontrados no e-SUS Regulação para o período {startDate} até {endDate}.
              </p>
            </div>

            <button
              type="button"
              onClick={handleStartImport}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-2 shadow-md cursor-pointer active:scale-98"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Confirmar & Iniciar Ingestão no SINPeP</span>
            </button>
          </div>

          {/* Cards de Métricas Pré-Importação */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total no e-SUS</span>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                {previewResult.totalHits.toLocaleString('pt-BR')}
              </div>
              <span className="text-[10px] text-slate-400">Registros no período</span>
            </div>

            <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/60 rounded-lg">
              <span className="text-[11px] font-medium text-blue-700 dark:text-blue-300">Pacientes Vivos</span>
              <div className="text-xl sm:text-2xl font-black text-blue-700 dark:text-blue-300 mt-1">
                {previewResult.livingCount.toLocaleString('pt-BR')}
              </div>
              <span className="text-[10px] text-blue-500">Deduplicação por CPF/CNS</span>
            </div>

            <div className="p-3.5 bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/60 rounded-lg">
              <span className="text-[11px] font-medium text-red-700 dark:text-red-300 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-red-600" /> Óbitos Descartados
              </span>
              <div className="text-xl sm:text-2xl font-black text-red-700 dark:text-red-300 mt-1">
                {previewResult.deceasedCount.toLocaleString('pt-BR')}
              </div>
              <span className="text-[10px] text-red-500">Filtrados rigorosamente</span>
            </div>

            <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 rounded-lg">
              <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">Requisições Alvo</span>
              <div className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
                {previewResult.eligibleRequestsCount.toLocaleString('pt-BR')}
              </div>
              <span className="text-[10px] text-emerald-600 font-semibold">Nos 4 status pendentes</span>
            </div>
          </div>

          {/* Distribuição por Status no e-SUS */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Distribuição dos Status de Solicitação no e-SUS
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
              {previewResult.statusBuckets.map((bucket) => {
                const isTarget = [
                  'lista de espera',
                  'pendente de agendamento',
                  'aguardando autorização',
                  'pendente na regulação',
                  'devolvida',
                  'devolvido',
                  'agendamento cancelado',
                ].some((w) => bucket.key.toLowerCase().includes(w));

                return (
                  <div
                    key={bucket.key}
                    className={`p-2.5 rounded-lg border flex items-center justify-between ${
                      isTarget
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 opacity-75'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <span className="font-medium text-slate-800 dark:text-slate-200 block truncate">
                        {bucket.key}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {isTarget ? 'Será importada para regulação' : 'Apenas paciente importado'}
                      </span>
                    </div>
                    <span
                      className={`font-mono font-bold px-2 py-0.5 rounded text-xs shrink-0 ${
                        isTarget
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {bucket.doc_count.toLocaleString('pt-BR')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Painel 3: Acompanhamento em Tempo Real durante a Ingestão */}
      {isRunning && (
        <div className="bg-white dark:bg-slate-900 border-2 border-blue-500 rounded-xl p-5 shadow-lg space-y-5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Sincronização em Andamento via Navegador
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {progress.stage} • Lote {progress.batchIndex} de {progress.totalBatches}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={cancelImport}
              className="px-3.5 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 dark:bg-red-950/40 dark:text-red-300 border border-red-300 dark:border-red-800 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <StopCircle className="w-4 h-4 text-red-600" />
              <span>Interromper</span>
            </button>
          </div>

          {/* Barra de Progresso Animada */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-700 dark:text-slate-300">
                {progress.current.toLocaleString('pt-BR')} de {progress.total.toLocaleString('pt-BR')} registros processados
              </span>
              <span className="text-blue-600 font-bold">{progress.percent}%</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden p-0.5">
              <div
                className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-300 shadow-sm"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </div>

          {/* Contadores Parciais em Tempo Real */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
            <div className="p-2.5 bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/60 rounded-lg text-center">
              <span className="text-[10px] text-blue-700 dark:text-blue-300 font-semibold block">Novos Pacientes</span>
              <span className="text-lg font-bold text-blue-800 dark:text-blue-200">
                +{totals.patientsCreated.toLocaleString('pt-BR')}
              </span>
            </div>
            <div className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-center">
              <span className="text-[10px] text-slate-500 font-semibold block">Pacientes Atualizados</span>
              <span className="text-lg font-bold text-slate-800 dark:text-slate-200">
                {totals.patientsUpdated.toLocaleString('pt-BR')}
              </span>
            </div>
            <div className="p-2.5 bg-red-50/40 dark:bg-red-950/20 border border-red-200 dark:border-red-900/60 rounded-lg text-center">
              <span className="text-[10px] text-red-700 dark:text-red-300 font-semibold block">Óbitos Descartados</span>
              <span className="text-lg font-bold text-red-800 dark:text-red-200">
                {totals.patientsDeceasedSkipped.toLocaleString('pt-BR')}
              </span>
            </div>
            <div className="p-2.5 bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 rounded-lg text-center">
              <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold block">Requisições Criadas</span>
              <span className="text-lg font-bold text-emerald-800 dark:text-emerald-200">
                +{totals.requestsCreated.toLocaleString('pt-BR')}
              </span>
            </div>
            <div className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-center">
              <span className="text-[10px] text-slate-500 font-semibold block">Requisições Atualizadas</span>
              <span className="text-lg font-bold text-slate-800 dark:text-slate-200">
                {totals.requestsUpdated.toLocaleString('pt-BR')}
              </span>
            </div>
            <div className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-center">
              <span className="text-[10px] text-slate-500 font-semibold block">Não-Pendentes</span>
              <span className="text-lg font-bold text-slate-500">
                {totals.requestsSkippedStatus.toLocaleString('pt-BR')}
              </span>
            </div>
          </div>

          {/* Console / Terminal de Logs ao Vivo */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
              <Terminal className="w-3.5 h-3.5" />
              <span>Log de Execução em Tempo Real</span>
            </div>
            <div className="h-44 overflow-y-auto bg-slate-950 text-slate-200 font-mono text-[11px] p-3 rounded-lg border border-slate-800 space-y-1 scrollbar-thin">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                  <span
                    className={
                      log.type === 'success'
                        ? 'text-emerald-400'
                        : log.type === 'warn'
                        ? 'text-amber-400'
                        : log.type === 'error'
                        ? 'text-red-400 font-bold'
                        : 'text-slate-300'
                    }
                  >
                    {log.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Painel 4: Histórico de Importações Anteriores */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Histórico de Importações & Auditoria
            </h2>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {jobs.length} execuções registradas
          </span>
        </div>

        {isJobsLoading ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Carregando histórico de importações...
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Nenhuma importação do e-SUS realizada anteriormente.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Início</th>
                  <th className="px-4 py-3">Período e-SUS</th>
                  <th className="px-4 py-3">Total Processado</th>
                  <th className="px-4 py-3">Novos Pacientes</th>
                  <th className="px-4 py-3">Óbitos Ignorados</th>
                  <th className="px-4 py-3">Requisições Criadas</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Operador</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {new Date(job.startedAt).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px]">
                      {job.dateRangeStart || '—'} até {job.dateRangeEnd || '—'}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                      {job.totalRecordsProcessed.toLocaleString('pt-BR')} / {job.totalRecordsFound.toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-blue-600 dark:text-blue-400 font-semibold">
                      +{job.patientsCreated.toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-red-600 dark:text-red-400 font-semibold">
                      {job.patientsDeceasedSkipped.toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-semibold">
                      +{job.requestsCreated.toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getStatusBadge(job.status)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {job.createdByUser?.name || 'Sistema'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

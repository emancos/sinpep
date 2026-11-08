import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { reportsService } from '../../services/reports';
import { Loader2, Layers, AlertTriangle, Building2, Filter } from 'lucide-react';

const RISK_COLORS: Record<string, string> = {
  VERMELHO: '#ef4444',
  AMARELO: '#f59e0b',
  VERDE: '#10b981',
  AZUL: '#3b82f6',
};

export const RegulationDash: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [risk, setRisk] = useState('');
  const [status, setStatus] = useState('');
  const [origin, setOrigin] = useState('');

  const fetchReport = () => {
    setLoading(true);
    reportsService
      .getRegulation({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        risk: risk || undefined,
        status: status || undefined,
        origin: origin || undefined,
      })
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate, risk, status, origin]);

  if (loading && !data) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const statusCounts = data?.statusCounts || {};
  const riskBreakdown = data?.riskBreakdown || [];
  const bySpecialty = data?.bySpecialty || [];
  const bySolicitingUnit = data?.bySolicitingUnit || [];

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
          Relatório da Central Municipal de Regulação
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Indicadores do fluxo de triagem, demanda reprimida por especialidade e tempos de resposta aos encaminhamentos.
        </p>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-500 font-semibold">
          <Filter className="w-4 h-4 text-blue-600" />
          <span>Filtrar período e parâmetros:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-2xs text-slate-400">De:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-2xs text-slate-400">Até:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>

          <select
            value={risk}
            onChange={(e) => setRisk(e.target.value)}
            className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
          >
            <option value="">Todos os Riscos</option>
            <option value="VERMELHO">Vermelho (Emergência)</option>
            <option value="AMARELO">Amarelo (Urgência)</option>
            <option value="VERDE">Verde (Pouco Urgente)</option>
            <option value="AZUL">Azul (Não Urgente)</option>
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
          >
            <option value="">Todos os Status</option>
            <option value="PENDENTE_REGULACAO">Pendente Triagem</option>
            <option value="PENDENTE_AGENDAMENTO">Fila de Espera</option>
            <option value="AGENDADA">Agendada</option>
            <option value="DEVOLVIDA">Devolvida</option>
            <option value="NEGADA">Negada</option>
          </select>

          <select
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            className="px-2.5 py-1 text-xs rounded-lg border border-blue-300 dark:border-blue-700 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300 font-semibold"
          >
            <option value="">Origem: Todas (SINPeP + e-SUS)</option>
            <option value="ESUS">Apenas e-SUS Regulação</option>
            <option value="SINPEP">Apenas SINPeP</option>
          </select>
        </div>
      </div>

      {/* Indicador de Integração de Fontes */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-xs">
        <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Base Integrada: dados sincronizados do <strong>e-SUS Regulação</strong> e solicitações nativas do <strong>SINPeP</strong>.</span>
        </div>
        <div className="flex items-center gap-3 text-2xs font-semibold">
          <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            e-SUS: {statusCounts.esus_total || 0} solicitações
          </span>
          <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            SINPeP: {statusCounts.sinpep_total || 0} solicitações
          </span>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-center">
          <span className="text-2xs font-semibold text-amber-700 dark:text-amber-300 block">Pendente Triagem</span>
          <strong className="text-2xl font-bold text-amber-800 dark:text-amber-200 mt-1 block">
            {statusCounts.to_evaluate || 0}
          </strong>
        </div>

        <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 text-center">
          <span className="text-2xs font-semibold text-blue-700 dark:text-blue-300 block">Fila de Espera</span>
          <strong className="text-2xl font-bold text-blue-800 dark:text-blue-200 mt-1 block">
            {statusCounts.waiting_list || 0}
          </strong>
        </div>

        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-center">
          <span className="text-2xs font-semibold text-emerald-700 dark:text-emerald-300 block">Agendadas</span>
          <strong className="text-2xl font-bold text-emerald-800 dark:text-emerald-200 mt-1 block">
            {statusCounts.scheduled || 0}
          </strong>
        </div>

        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-center">
          <span className="text-2xs font-semibold text-rose-700 dark:text-rose-300 block">Devolvidas</span>
          <strong className="text-2xl font-bold text-rose-800 dark:text-rose-200 mt-1 block">
            {statusCounts.returned || 0}
          </strong>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
          <span className="text-2xs font-semibold text-slate-600 dark:text-slate-400 block">Total Geral</span>
          <strong className="text-2xl font-bold text-slate-800 dark:text-slate-200 mt-1 block">
            {statusCounts.total || 0}
          </strong>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Riscos */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Solicitações por Grau de Risco (Manchester)
            </h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskBreakdown} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="risk" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {riskBreakdown.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={RISK_COLORS[entry.risk] || '#64748b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Especialidades */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Top Especialidades com Maior Volume de Demandas
            </h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bySpecialty} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="specialty_name" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total_requests" fill="#0051A2" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Demanda por UBS Solicitante */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
            Encaminhamentos por Unidade Básica de Saúde (UBS Solicitante)
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Unidade Solicitante (UBS)</th>
                <th className="py-2.5 px-3 text-center">Total Encaminhado</th>
                <th className="py-2.5 px-3 text-center">Agendadas</th>
                <th className="py-2.5 px-3 text-center">Devolvidas</th>
                <th className="py-2.5 px-3 text-right">Taxa de Devolução</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {bySolicitingUnit.map((u: any, idx: number) => {
                const total = u.total_requests || 0;
                const returned = u.returned || 0;
                const rate = total > 0 ? Math.round((returned / total) * 100) : 0;
                return (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                      {u.ubs_name}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-blue-600 dark:text-blue-400">
                      {total}
                    </td>
                    <td className="py-2.5 px-3 text-center text-emerald-600 font-medium">
                      {u.scheduled || 0}
                    </td>
                    <td className="py-2.5 px-3 text-center text-rose-600 font-medium">
                      {returned}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className={`px-2 py-0.5 rounded text-3xs font-bold ${
                        rate > 20 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {rate}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

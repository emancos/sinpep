import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { reportsService } from '../../services/reports';
import { Loader2, Database, Activity, Layers, CalendarCheck, TrendingUp, UserCheck } from 'lucide-react';
import { DescriptiveChartCard } from './components/DescriptiveChartCard';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#ec4899'];

export const OperationalDash = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportsService.getOperational().then((res) => {
      setData(res);
      setLoading(false);
    });
  }, []);

  if (loading || !data) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const byOrigin = data?.byOrigin || { sinpep: 0, esus: 0, percentageEsus: 0, percentageSinpep: 0 };

  // Tabela de apoio dos Médicos
  const doctorsTable = (
    <div className="overflow-x-auto max-h-72">
      <table className="w-full text-xs text-left min-w-[340px]">
        <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100 dark:border-slate-800 sticky top-0">
          <tr>
            <th className="py-2 px-3 whitespace-nowrap">Profissional Médico</th>
            <th className="py-2 px-3 text-right whitespace-nowrap">Consultas / Atendimentos Concluídos</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {(data.recordsByDoctor || []).map((d: any, idx: number) => (
            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
              <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">{d.doctor_name}</td>
              <td className="py-2 px-3 text-right font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">{d.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
          Indicadores Operacionais Integrados
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Visão holística da rede municipal consolidando dados assistenciais do SINPeP e da regulação via e-SUS Regulação.
        </p>
      </div>

      {/* Cards de Resumo Operacional */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 mb-1">
            <Activity className="w-4 h-4" />
            <span className="text-2xs font-bold uppercase tracking-wider">Atendimentos Clínicos</span>
          </div>
          <strong className="text-2xl font-extrabold text-blue-900 dark:text-blue-100 block">
            {data.totalRecords || 0}
          </strong>
          <span className="text-3xs text-slate-500">Prontuários eletrônicos</span>
        </div>

        <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/40">
          <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 mb-1">
            <Layers className="w-4 h-4" />
            <span className="text-2xs font-bold uppercase tracking-wider">Demanda Regulatória</span>
          </div>
          <strong className="text-2xl font-extrabold text-indigo-900 dark:text-indigo-100 block">
            {data.totalRegulationRequests || 0}
          </strong>
          <span className="text-3xs text-slate-500">SINPeP & e-SUS Regulação</span>
        </div>

        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 mb-1">
            <CalendarCheck className="w-4 h-4" />
            <span className="text-2xs font-bold uppercase tracking-wider">Acolhimento Recepção</span>
          </div>
          <strong className="text-2xl font-extrabold text-emerald-900 dark:text-emerald-100 block">
            {data.totalReceptionQueue || 0}
          </strong>
          <span className="text-3xs text-slate-500">Pacientes na fila/atendidos</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 mb-1">
            <Database className="w-4 h-4" />
            <span className="text-2xs font-bold uppercase tracking-wider">Volume Consolidado</span>
          </div>
          <strong className="text-2xl font-extrabold text-slate-900 dark:text-white block">
            {data.totalConsolidated || 0}
          </strong>
          <span className="text-3xs text-slate-500">Total de registros na base</span>
        </div>
      </div>

      {/* Card de Proporção de Origem dos Dados (SINPeP vs e-SUS) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Distribuição por Origem dos Dados
            </h3>
          </div>
          <span className="text-2xs text-slate-500">
            Total integrado: {byOrigin.sinpep + byOrigin.esus} registros
          </span>
        </div>

        <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
          <div
            style={{ width: `${byOrigin.percentageEsus}%` }}
            className="h-full bg-emerald-500 transition-all duration-500"
            title={`e-SUS Regulação: ${byOrigin.esus} (${byOrigin.percentageEsus}%)`}
          />
          <div
            style={{ width: `${byOrigin.percentageSinpep}%` }}
            className="h-full bg-[#0051A2] transition-all duration-500"
            title={`SINPeP: ${byOrigin.sinpep} (${byOrigin.percentageSinpep}%)`}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 pt-1 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
            <div>
              <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                e-SUS Regulação ({byOrigin.percentageEsus}%)
              </span>
              <span className="text-2xs text-slate-500">
                {byOrigin.esus} solicitações & atendimentos importados
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-[#0051A2] shrink-0" />
            <div>
              <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                SINPeP Nativo ({byOrigin.percentageSinpep}%)
              </span>
              <span className="text-2xs text-slate-500">
                {byOrigin.sinpep} prontuários e registros emitidos localmente
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Atendimentos por mês */}
        <DescriptiveChartCard
          title="Série Histórica: Evolução de Atendimentos & Demandas por Mês"
          description="Acompanhamento longitudinal dos últimos 6 meses consolidando atendimentos clínicos ambulatoriais e demandas de regulação."
          badge="Últimos 6 meses"
          icon={TrendingUp}
          note="Gráfico de tendência temporal para planejamento de metas assistenciais e auditoria de cobertura municipal."
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.recordsByMonth} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis />
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <Tooltip />
                <Area type="monotone" dataKey="count" name="Total Integrado" stroke="#003B77" fillOpacity={0.15} fill="#003B77" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </DescriptiveChartCard>

        {/* Médicos */}
        <DescriptiveChartCard
          title="Top 10 Médicos por Volume de Atendimento Clínico"
          description="Profissionais com maior número de consultas e prontuários finalizados no sistema."
          badge="Produção Médica"
          icon={UserCheck}
          tableData={doctorsTable}
          note="Alterne para a visão Tabela para analisar os totais absolutos de consultas finalizadas por cada médico."
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.recordsByDoctor} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="doctor_name" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip formatter={(value) => [`${value} atendimentos`, 'Volume']} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {data.recordsByDoctor.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DescriptiveChartCard>
      </div>
    </div>
  );
};

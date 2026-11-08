import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { reportsService } from '../../services/reports';
import { Loader2, Stethoscope, ClipboardList, Filter } from 'lucide-react';
import { formatDateBR } from '../../utils/brazilianFormatters';

export const DoctorProductionDash: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchReport = () => {
    setLoading(true);
    reportsService
      .getDoctorProduction({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
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
  }, [startDate, endDate]);

  if (loading && !data) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const totalConsultations = data?.totalConsultations || 0;
  const monthlyEvolution = data?.monthlyEvolution || [];
  const topCid10 = data?.topCid10 || [];
  const period = data?.period || {};

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
          Relatório de Produção Clínica Individual
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Estatísticas da sua atuação ambulatorial, consultas realizadas e perfil nosológico dos seus diagnósticos.
        </p>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-500 font-semibold">
          <Filter className="w-4 h-4 text-blue-600" />
          <span>Período da Análise: {formatDateBR(period.start)} até {formatDateBR(period.end)}</span>
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
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 block">Total de Consultas no Período</span>
            <strong className="text-3xl font-extrabold text-blue-900 dark:text-blue-100 mt-1 block">
              {totalConsultations}
            </strong>
            <span className="text-2xs text-blue-600 dark:text-blue-400">Prontuários clínicos finalizados</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
            <ClipboardList className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/40 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 block">Diagnósticos Diferentes</span>
            <strong className="text-3xl font-extrabold text-indigo-900 dark:text-indigo-100 mt-1 block">
              {topCid10.length}
            </strong>
            <span className="text-2xs text-indigo-600 dark:text-indigo-400">CIDs registrados no período</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
            <Stethoscope className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Evolução Mensal */}
      {monthlyEvolution.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4">
            Evolução dos Atendimentos Realizados (Mês a Mês)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyEvolution} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis />
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Top CIDs do Médico */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
          Top 10 Diagnósticos (CID-10) mais Frequentes no seu Consultório
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Código CID-10</th>
                <th className="py-2.5 px-3 text-right">Ocorrências</th>
                <th className="py-2.5 px-3 text-right">Percentual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {topCid10.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-slate-400">
                    Nenhum diagnóstico registrado no período.
                  </td>
                </tr>
              ) : (
                topCid10.map((c: any, idx: number) => {
                  const pct = totalConsultations > 0 ? Math.round((c.count / totalConsultations) * 100) : 0;
                  return (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-mono font-bold text-indigo-700 dark:text-indigo-300">
                        {c.cid10}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-800 dark:text-slate-100">
                        {c.count} paciente(s)
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="px-2 py-0.5 rounded text-3xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {pct}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

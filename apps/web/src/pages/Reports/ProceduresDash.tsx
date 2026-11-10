import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { reportsService } from '../../services/reports';
import { Loader2, Stethoscope } from 'lucide-react';
import { DescriptiveChartCard } from './components/DescriptiveChartCard';

const COLORS = ['#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', '#f97316'];

export const ProceduresDash = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportsService.getProcedures().then((res) => {
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

  // Tabela de apoio dos Exames
  const proceduresTable = (
    <div className="overflow-x-auto max-h-96">
      <table className="w-full text-xs text-left min-w-[500px]">
        <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100 dark:border-slate-800 sticky top-0">
          <tr>
            <th className="py-2 px-3 whitespace-nowrap">Procedimento / Exame</th>
            <th className="py-2 px-3 text-center whitespace-nowrap">Origem e-SUS</th>
            <th className="py-2 px-3 text-center whitespace-nowrap">Origem SINPeP</th>
            <th className="py-2 px-3 text-right whitespace-nowrap">Total Demandado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {(data.topExams || []).map((e: any, idx: number) => (
            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
              <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">{e.exam}</td>
              <td className="py-2 px-3 text-center text-slate-500 whitespace-nowrap">{e.from_esus || 0}</td>
              <td className="py-2 px-3 text-center text-slate-500 whitespace-nowrap">{e.from_sinpep || 0}</td>
              <td className="py-2 px-3 text-right font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">{e.count}</td>
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
          Exames & Procedimentos Integrados
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Ranking consolidado de procedimentos e exames solicitados na Central de Regulação (e-SUS & SINPeP) e consultas ambulatoriais.
        </p>
      </div>

      <DescriptiveChartCard
        title="Top 15 Procedimentos & Exames Mais Demandados na Rede"
        description="Mapeamento consolidando solicitações via e-SUS Regulação, pedidos de exames em prontuários eletrônicos do SINPeP e regulação local."
        badge="Consolidando e-SUS + SINPeP"
        icon={Stethoscope}
        tableData={proceduresTable}
        note="Alterne para a visão Tabela para analisar os quantitativos desmembrados por sistema de origem."
      >
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.topExams} layout="vertical" margin={{ top: 5, right: 30, left: 140, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis type="number" />
              <YAxis
                dataKey="exam"
                type="category"
                width={200}
                fontSize={11}
                tickFormatter={(value) => (value && value.length > 28 ? value.substring(0, 28) + '...' : value || 'Outros')}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    return (
                      <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 text-xs max-w-xs">
                        <p className="font-bold text-slate-900 dark:text-white">{item.exam}</p>
                        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 space-y-0.5 text-2xs">
                          <p className="font-semibold text-blue-600 dark:text-blue-400">Total: {item.count} requisições</p>
                          <p className="text-slate-500">Origem e-SUS: {item.from_esus || 0}</p>
                          <p className="text-slate-500">Origem SINPeP: {item.from_sinpep || 0}</p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]}>
                {data.topExams.map((_: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </DescriptiveChartCard>
    </div>
  );
};

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { reportsService } from '../../services/reports';
import { Loader2 } from 'lucide-react';

const COLORS = ['#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', '#f97316'];

export const ProceduresDash = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportsService.getProcedures().then(res => {
      setData(res);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
  }

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

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
            Top 15 Procedimentos & Exames Mais Demandados
          </h3>
          <span className="text-3xs font-semibold px-2.5 py-1 rounded bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800 self-start sm:self-auto">
            Consolidando e-SUS Regulação + SINPeP
          </span>
        </div>

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
      </div>
    </div>
  );
};

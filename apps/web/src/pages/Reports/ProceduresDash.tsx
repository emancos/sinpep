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
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Exames e Procedimentos</h2>
        <p className="text-slate-500 dark:text-slate-400">Ranking dos serviços solicitados pela unidade.</p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 text-center">Top 15 Exames Solicitados</h3>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.topExams} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis type="number" />
              <YAxis dataKey="exam" type="category" width={250} fontSize={12} tickFormatter={(value) => value.length > 30 ? value.substring(0, 30) + '...' : value} />
              <Tooltip formatter={(value) => [`${value} requisições`, 'Quantidade']} />
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

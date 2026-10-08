import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { reportsService } from '../../services/reports';
import { Loader2 } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#ec4899'];

export const OperationalDash = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportsService.getOperational().then(res => {
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
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Indicadores Operacionais</h2>
        <p className="text-slate-500 dark:text-slate-400">Total de {data.totalRecords} prontuários fechados no sistema.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Prontuários por mês */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm lg:col-span-2">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 text-center">Atendimentos por Mês (Últimos 6 meses)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.recordsByMonth} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <XAxis dataKey="month" />
                <YAxis />
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#003B77" fillOpacity={0.1} fill="#003B77" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Médicos */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm lg:col-span-2">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 text-center">Top 10 Médicos por Volume de Atendimento</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.recordsByDoctor} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="doctor_name" tick={{fontSize: 12}} />
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
        </div>
      </div>
    </div>
  );
};

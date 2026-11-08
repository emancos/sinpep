import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { reportsService } from '../../services/reports';
import { Loader2 } from 'lucide-react';

const COLORS = ['#ef4444', '#3b82f6', '#f97316', '#a855f7', '#10b981'];

export const EpidemiologicalDash = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportsService.getEpidemiological().then(res => {
      setData(res);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
  }

  const comorbiditiesData = [
    { name: 'Hipertensos', value: data.comorbidities.hypertensive || 0 },
    { name: 'Diabéticos', value: data.comorbidities.diabetic || 0 },
    { name: 'Fumantes', value: data.comorbidities.smoker || 0 },
    { name: 'Oncológicos', value: data.comorbidities.oncological || 0 },
    { name: 'PcD', value: data.comorbidities.pcd || 0 },
  ];

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Visão Epidemiológica</h2>
        <p className="text-slate-500 dark:text-slate-400">Distribuição de comorbidades e diagnósticos frequentes na unidade.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Comorbidades */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 text-center">Perfil de Anamnese</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={comorbiditiesData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {comorbiditiesData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} pacientes`, 'Quantidade']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CIDs */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Top 10 Diagnósticos (CID-10 Integrado)
            </h3>
            <span className="text-3xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              SINPeP & e-SUS Regulação
            </span>
          </div>
          <p className="text-2xs text-slate-400 mb-3">
            Morbidades mais incidentes consolidadas em atendimentos e encaminhamentos regulatórios
          </p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.topCid} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis type="number" />
                <YAxis dataKey="code" type="category" width={65} fontSize={11} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 text-xs max-w-xs">
                          <p className="font-bold text-slate-900 dark:text-white">{item.code}</p>
                          <p className="text-slate-600 dark:text-slate-300 text-2xs mt-0.5">{item.description}</p>
                          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 space-y-0.5 text-2xs">
                            <p className="font-semibold text-blue-600 dark:text-blue-400">Total: {item.count} ocorrências</p>
                            <p className="text-slate-500">e-SUS Regulação: {item.from_esus || 0}</p>
                            <p className="text-slate-500">SINPeP: {item.from_sinpep || 0}</p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" fill="#003B77" radius={[0, 4, 4, 0]}>
                  {data.topCid.map((_: any, index: number) => (
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

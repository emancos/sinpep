import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { reportsService } from '../../services/reports';
import { Loader2, HeartPulse, Activity } from 'lucide-react';
import { DescriptiveChartCard } from './components/DescriptiveChartCard';
import { EnrichedLegend } from './components/EnrichedLegend';

const COLORS = ['#ef4444', '#3b82f6', '#f97316', '#a855f7', '#10b981'];

export const EpidemiologicalDash = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportsService.getEpidemiological().then((res) => {
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

  const comorbiditiesData = [
    { name: 'Hipertensos', value: data.comorbidities?.hypertensive || 0, color: COLORS[0] },
    { name: 'Diabéticos', value: data.comorbidities?.diabetic || 0, color: COLORS[1] },
    { name: 'Fumantes', value: data.comorbidities?.smoker || 0, color: COLORS[2] },
    { name: 'Oncológicos', value: data.comorbidities?.oncological || 0, color: COLORS[3] },
    { name: 'PcD', value: data.comorbidities?.pcd || 0, color: COLORS[4] },
  ];

  const totalComorbidities = comorbiditiesData.reduce((acc, c) => acc + c.value, 0);

  const legendItems = comorbiditiesData.map((c) => ({
    color: c.color,
    label: c.name,
    count: c.value,
    percentage: totalComorbidities > 0 ? (c.value / totalComorbidities) * 100 : 0,
  }));

  // Tabela de apoio para os CIDs
  const cidTable = (
    <div className="overflow-x-auto max-h-72">
      <table className="w-full text-xs text-left min-w-[500px]">
        <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100 dark:border-slate-800 sticky top-0">
          <tr>
            <th className="py-2 px-3 whitespace-nowrap">CID-10</th>
            <th className="py-2 px-3">Descrição da Doença / Agravo</th>
            <th className="py-2 px-3 text-center whitespace-nowrap">e-SUS</th>
            <th className="py-2 px-3 text-center whitespace-nowrap">SINPeP</th>
            <th className="py-2 px-3 text-right whitespace-nowrap">Total Ocorrências</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {(data.topCid || []).map((c: any, idx: number) => (
            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
              <td className="py-2 px-3 font-bold font-mono text-blue-700 dark:text-blue-400 whitespace-nowrap">{c.code}</td>
              <td className="py-2 px-3 text-slate-700 dark:text-slate-300 font-medium">{c.description}</td>
              <td className="py-2 px-3 text-center text-slate-500 whitespace-nowrap">{c.from_esus || 0}</td>
              <td className="py-2 px-3 text-center text-slate-500 whitespace-nowrap">{c.from_sinpep || 0}</td>
              <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">{c.count}</td>
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
          Perfil Epidemiológico Municipal
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Mapeamento populacional de doenças crônicas, fatores de risco e morbidades consolidadas na rede de atenção básica e especializada.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Comorbidades */}
        <DescriptiveChartCard
          title="Prevalência de Condições Crônicas & Fatores de Risco"
          description="Distribuição percentual dos agravos declarados e catalogados nas anamneses clínicas dos pacientes da rede."
          badge="Anamnese Clínica"
          icon={HeartPulse}
          note="Indicador consolidado a partir das avaliações clínicas ativas no prontuário eletrônico."
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={comorbiditiesData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {comorbiditiesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} pacientes`, 'Quantidade']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <EnrichedLegend items={legendItems} total={totalComorbidities} columns={2} />
        </DescriptiveChartCard>

        {/* Top 10 CIDs */}
        <DescriptiveChartCard
          title="Top 10 Morbidades Mais Incidentes (CID-10 Integrado)"
          description="Frequência nosológica consolidando atendimentos ambulatoriais locais e solicitações de regulação via e-SUS Regulação."
          badge="SINPeP & e-SUS Regulação"
          icon={Activity}
          tableData={cidTable}
          note="Classificação padronizada segundo a tabela CID-10 do Ministério da Saúde. Alterne para a visão Tabela para analisar os quantitativos por fonte."
        >
          <div className="h-80">
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
                <Bar dataKey="count" fill="#0051A2" radius={[0, 4, 4, 0]}>
                  {data.topCid.map((_: any, index: number) => (
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

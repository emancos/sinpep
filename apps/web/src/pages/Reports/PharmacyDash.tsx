import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { reportsService } from '../../services/reports';
import { Loader2, Pill } from 'lucide-react';
import { DescriptiveChartCard } from './components/DescriptiveChartCard';

const COLORS_CONT = ['#10b981', '#34d399', '#6ee7b7'];
const COLORS_PRES = ['#ef4444', '#f87171', '#fca5a5'];

export const PharmacyDash = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportsService.getPharmacy().then((res) => {
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

  // Tabela Medicamentos de Uso Contínuo
  const continuousTable = (
    <div className="overflow-x-auto max-h-80">
      <table className="w-full text-xs text-left min-w-[340px]">
        <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100 dark:border-slate-800 sticky top-0">
          <tr>
            <th className="py-2 px-3 whitespace-nowrap">Medicamento de Uso Contínuo</th>
            <th className="py-2 px-3 text-right whitespace-nowrap">Pacientes em Tratamento</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {(data.continuousMedications || []).map((m: any, idx: number) => (
            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
              <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">{m.medication}</td>
              <td className="py-2 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{m.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Tabela Medicamentos Prescritos
  const prescribedTable = (
    <div className="overflow-x-auto max-h-80">
      <table className="w-full text-xs text-left min-w-[340px]">
        <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100 dark:border-slate-800 sticky top-0">
          <tr>
            <th className="py-2 px-3 whitespace-nowrap">Medicamento Prescrito</th>
            <th className="py-2 px-3 text-right whitespace-nowrap">Prescrições Emitidas</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {(data.prescribedMedications || []).map((m: any, idx: number) => (
            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
              <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">{m.medication}</td>
              <td className="py-2 px-3 text-right font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">{m.count}</td>
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
          Farmácia e Prescrições Clínicas
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Análise de padrões terapêuticos, medicamentos de uso contínuo cadastrados e prescrições emitidas em consultório.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Uso Continuo */}
        <DescriptiveChartCard
          title="Top 15 - Medicações de Uso Contínuo"
          description="Fármacos de uso prolongado ou contínuo identificados nas anamneses clínicas dos pacientes."
          badge="Atenção Básica"
          icon={Pill}
          tableData={continuousTable}
          note="Alterne para a visualização Tabela para inspecionar os números exatos de pacientes por medicamento."
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.continuousMedications} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis type="number" />
                <YAxis dataKey="medication" type="category" width={120} fontSize={11} />
                <Tooltip formatter={(value) => [`${value} pacientes`, 'Quantidade']} />
                <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]}>
                  {data.continuousMedications.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS_CONT[index % COLORS_CONT.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DescriptiveChartCard>

        {/* Mais Prescritas */}
        <DescriptiveChartCard
          title="Top 15 - Medicamentos Mais Prescritos"
          description="Receitas médicas emitidas diretamente nos prontuários eletrônicos do SINPeP."
          badge="Prontuário Eletrônico"
          icon={Pill}
          tableData={prescribedTable}
          note="Dados extraídos das prescrições eletrônicas assinadas e validadas pelos médicos da rede."
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.prescribedMedications} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis type="number" />
                <YAxis dataKey="medication" type="category" width={120} fontSize={11} />
                <Tooltip formatter={(value) => [`${value} prescrições`, 'Quantidade']} />
                <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]}>
                  {data.prescribedMedications.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS_PRES[index % COLORS_PRES.length]} />
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

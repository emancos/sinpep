import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { reportsService } from '../../services/reports';
import { Loader2 } from 'lucide-react';

const COLORS_CONT = ['#10b981', '#34d399', '#6ee7b7'];
const COLORS_PRES = ['#ef4444', '#f87171', '#fca5a5'];

export const PharmacyDash = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportsService.getPharmacy().then(res => {
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
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Farmácia e Prescrições</h2>
        <p className="text-slate-500 dark:text-slate-400">Análise de medicações de uso contínuo e prescritas em consultório.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Uso Continuo */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <h3 className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 mb-4 text-center">Top 15 - Uso Contínuo (Anamnese)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.continuousMedications} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis type="number" />
                <YAxis dataKey="medication" type="category" width={120} fontSize={12} />
                <Tooltip formatter={(value) => [`${value} pacientes`, 'Quantidade']} />
                <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]}>
                  {data.continuousMedications.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS_CONT[index % COLORS_CONT.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Casuais */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4 text-center">Top 15 - Mais Prescritas (Prontuário)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.prescribedMedications} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis type="number" />
                <YAxis dataKey="medication" type="category" width={120} fontSize={12} />
                <Tooltip formatter={(value) => [`${value} prescrições`, 'Quantidade']} />
                <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]}>
                  {data.prescribedMedications.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS_PRES[index % COLORS_PRES.length]} />
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

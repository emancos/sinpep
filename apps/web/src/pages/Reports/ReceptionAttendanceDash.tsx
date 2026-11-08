import React, { useEffect, useState } from 'react';
import { reportsService } from '../../services/reports';
import { Loader2, Filter, UserCheck } from 'lucide-react';
import { formatDateBR, formatCPF } from '../../utils/brazilianFormatters';

export const ReceptionAttendanceDash: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filtro por Data
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);

  const fetchReport = () => {
    setLoading(true);
    reportsService
      .getReceptionAttendance({
        date: date || undefined,
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
  }, [date]);

  if (loading && !data) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
      </div>
    );
  }

  const statusTotals = data?.statusTotals || {};
  const attendanceList = data?.attendanceList || [];

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
          Folha de Presença & Acolhimento da Recepção
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Lista diária de comparecimento dos pacientes, ordem de chamada, classificação prioritária e faltas registradas.
        </p>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-500 font-semibold">
          <Filter className="w-4 h-4 text-rose-600" />
          <span>Data da Lista de Presença: <strong>{date ? formatDateBR(date) : 'Todos os Registros (Geral)'}</strong></span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-2xs text-slate-400">Selecionar data:</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
          />
          {date && (
            <button
              type="button"
              onClick={() => setDate('')}
              className="px-2.5 py-1 text-2xs rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition font-medium"
              title="Exibir todos os registros de acolhimento"
            >
              Ver Todas
            </button>
          )}
        </div>
      </div>

      {/* Cards de Resumo da Fila do Dia */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
          <span className="text-2xs font-semibold text-slate-600 dark:text-slate-400 block">Total Acolhido</span>
          <strong className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1 block">
            {statusTotals.total || 0}
          </strong>
          {(statusTotals.from_esus > 0 || statusTotals.from_sinpep > 0) && (
            <span className="text-3xs text-slate-400 block mt-0.5">
              e-SUS: {statusTotals.from_esus || 0} | SINPeP: {statusTotals.from_sinpep || 0}
            </span>
          )}
        </div>

        <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 text-center">
          <span className="text-2xs font-semibold text-blue-700 dark:text-blue-300 block">Na Sala de Espera</span>
          <strong className="text-2xl font-bold text-blue-800 dark:text-blue-200 mt-1 block">
            {statusTotals.waiting || 0}
          </strong>
        </div>

        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-center">
          <span className="text-2xs font-semibold text-amber-700 dark:text-amber-300 block">Em Atendimento</span>
          <strong className="text-2xl font-bold text-amber-800 dark:text-amber-200 mt-1 block">
            {statusTotals.in_attendance || 0}
          </strong>
        </div>

        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-center">
          <span className="text-2xs font-semibold text-emerald-700 dark:text-emerald-300 block">Atendidos</span>
          <strong className="text-2xl font-bold text-emerald-800 dark:text-emerald-200 mt-1 block">
            {statusTotals.completed || 0}
          </strong>
        </div>

        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-center">
          <span className="text-2xs font-semibold text-rose-700 dark:text-rose-300 block">Faltas (No-Show)</span>
          <strong className="text-2xl font-bold text-rose-800 dark:text-rose-200 mt-1 block">
            {statusTotals.no_show || 0}
          </strong>
        </div>
      </div>

      {/* Tabela da Folha de Sala */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-rose-600" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Folha Nominal de Comparecimento e Presença
            </h3>
          </div>
          <span className="text-2xs text-slate-400">
            {attendanceList.length} registro(s) no dia
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-3 text-center">Ordem</th>
                <th className="py-2.5 px-3">Origem</th>
                <th className="py-2.5 px-3">Horário</th>
                <th className="py-2.5 px-3">Paciente</th>
                <th className="py-2.5 px-3">CPF</th>
                <th className="py-2.5 px-3">Especialidade</th>
                <th className="py-2.5 px-3 text-center">Prioridade</th>
                <th className="py-2.5 px-3 text-center">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {attendanceList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Nenhum atendimento na recepção registrado para a data selecionada.
                  </td>
                </tr>
              ) : (
                attendanceList.map((item: any, idx: number) => {
                  let statusBadge = 'bg-slate-100 text-slate-700';
                  if (item.status === 'AGUARDANDO') statusBadge = 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
                  if (item.status === 'CHAMADO' || item.status === 'EM_ATENDIMENTO') statusBadge = 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
                  if (item.status === 'FINALIZADO') statusBadge = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
                  if (item.status === 'NAO_COMPARECEU') statusBadge = 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300';

                  return (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 text-center font-bold text-slate-700 dark:text-slate-300">
                        {item.queue_order || idx + 1}º
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-3xs font-semibold ${
                          item.origin?.includes('e-SUS')
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                        }`}>
                          {item.origin || 'SINPeP'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-800 dark:text-slate-200">
                        {item.time || '—'}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                        {item.patient_name || 'Paciente sem cadastro'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-2xs text-slate-500">
                        {formatCPF(item.patient_cpf)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 font-medium">
                        {item.specialty_name}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-3xs font-bold uppercase ${
                          item.priority === 'PRIORITARIO'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          {item.priority || 'CONVENCIONAL'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-3xs font-bold uppercase ${statusBadge}`}>
                          {item.status}
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

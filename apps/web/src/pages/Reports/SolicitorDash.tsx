import React, { useEffect, useState } from 'react';
import { reportsService } from '../../services/reports';
import { Loader2, RotateCcw, CalendarCheck, Filter, Ticket } from 'lucide-react';
import { formatDateBR, formatCPF, formatCNS } from '../../utils/brazilianFormatters';

export const SolicitorDash: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('');

  const fetchReport = () => {
    setLoading(true);
    reportsService
      .getSolicitor({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        status: status || undefined,
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
  }, [startDate, endDate, status]);

  if (loading && !data) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const summary = data?.summary || {};
  const scheduledPatients = data?.scheduledPatients || [];
  const returnReasons = data?.returnReasons || [];

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
          Relatório de Encaminhamentos da Atenção Básica (UBS)
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Extrato das solicitações geradas pela unidade, motivos de devoluções e relação de consultas/exames agendados.
        </p>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-500 font-semibold">
          <Filter className="w-4 h-4 text-emerald-600" />
          <span>Filtrar por período e situação:</span>
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

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
          >
            <option value="">Todas as Situações</option>
            <option value="PENDENTE_REGULACAO">Pendente Triagem</option>
            <option value="PENDENTE_AGENDAMENTO">Fila de Espera</option>
            <option value="AGENDADA">Agendada</option>
            <option value="DEVOLVIDA">Devolvida</option>
            <option value="NEGADA">Negada</option>
          </select>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
          <span className="text-2xs font-semibold text-slate-600 dark:text-slate-400 block">Total Gerado</span>
          <strong className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1 block">
            {summary.total || 0}
          </strong>
        </div>

        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-center">
          <span className="text-2xs font-semibold text-amber-700 dark:text-amber-300 block">Aguardando Triagem</span>
          <strong className="text-2xl font-bold text-amber-800 dark:text-amber-200 mt-1 block">
            {summary.to_evaluate || 0}
          </strong>
        </div>

        <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 text-center">
          <span className="text-2xs font-semibold text-blue-700 dark:text-blue-300 block">Fila de Espera</span>
          <strong className="text-2xl font-bold text-blue-800 dark:text-blue-200 mt-1 block">
            {summary.waiting_list || 0}
          </strong>
        </div>

        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-center">
          <span className="text-2xs font-semibold text-emerald-700 dark:text-emerald-300 block">Agendadas</span>
          <strong className="text-2xl font-bold text-emerald-800 dark:text-emerald-200 mt-1 block">
            {summary.scheduled || 0}
          </strong>
        </div>

        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-center">
          <span className="text-2xs font-semibold text-rose-700 dark:text-rose-300 block">Devolvidas</span>
          <strong className="text-2xl font-bold text-rose-800 dark:text-rose-200 mt-1 block">
            {summary.returned || 0}
          </strong>
        </div>
      </div>

      {/* Motivos de Devolução Mais Frequentes */}
      {returnReasons.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <RotateCcw className="w-4 h-4 text-rose-600" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Diagnóstico de Devoluções pela Central de Regulação
            </h3>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Principais inconsistências e complementações clínicas solicitadas pelo médico regulador para a equipe da UBS:
          </p>

          <div className="space-y-2">
            {returnReasons.map((r: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-xs">
                <span className="text-rose-900 dark:text-rose-200 font-medium">
                  "{r.reason}"
                </span>
                <span className="px-2 py-0.5 rounded text-2xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300 shrink-0 ml-2">
                  {r.count} devoluç{r.count > 1 ? 'ões' : 'ão'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Relação Nominal de Pacientes Agendados */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Agenda dos Pacientes da UBS (Busca Ativa & Entrega de Guias)
            </h3>
          </div>
          <span className="text-2xs text-slate-400">
            {scheduledPatients.length} paciente(s) localizado(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Protocolo</th>
                <th className="py-2.5 px-3">Paciente</th>
                <th className="py-2.5 px-3">CPF / CNS</th>
                <th className="py-2.5 px-3">Especialidade</th>
                <th className="py-2.5 px-3">Data & Hora</th>
                <th className="py-2.5 px-3">Unidade Executante</th>
                <th className="py-2.5 px-3 text-center">Chave Confirmação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {scheduledPatients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Nenhum agendamento encontrado para o filtro selecionado.
                  </td>
                </tr>
              ) : (
                scheduledPatients.map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                      {p.protocol}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                      {p.patient_name}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-2xs text-slate-500">
                      <div>{formatCPF(p.patient_cpf)}</div>
                      {p.patient_cns && <div className="text-slate-400">{formatCNS(p.patient_cns)}</div>}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 font-medium">
                      {p.specialty_name}
                    </td>
                    <td className="py-2.5 px-3 text-emerald-700 dark:text-emerald-300 font-bold">
                      {formatDateBR(p.scheduled_date)} às {p.scheduled_time || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                      {p.executing_unit || 'Unidade Executante'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {p.token ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono font-bold text-3xs bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          <Ticket className="w-3 h-3" />
                          {p.token}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

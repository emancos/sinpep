import React, { useEffect, useState, useMemo } from 'react';
import { reportsService } from '../../services/reports';
import { Loader2, Filter, UserCheck, Printer, Search } from 'lucide-react';
import { formatDateBR, formatCPF } from '../../utils/brazilianFormatters';

export const ReceptionAttendanceDash: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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

  const handlePrintPdf = async () => {
    setIsExporting(true);
    try {
      const dateStr = date || new Date().toISOString().split('T')[0];
      await reportsService.exportReport(
        'reception-attendance',
        { date, format: 'pdf' },
        `folha-presenca-${dateStr}.pdf`
      );
    } catch (err) {
      console.error('Erro ao emitir PDF da folha de presença:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const statusTotals = data?.statusTotals || {};
  const rawAttendanceList = data?.attendanceList || [];

  const filteredAttendanceList = useMemo(() => {
    if (!searchTerm.trim()) return rawAttendanceList;
    const term = searchTerm.toLowerCase();
    return rawAttendanceList.filter((item: any) =>
      (item.patient_name && item.patient_name.toLowerCase().includes(term)) ||
      (item.patient_cpf && item.patient_cpf.includes(term)) ||
      (item.specialty_name && item.specialty_name.toLowerCase().includes(term))
    );
  }, [rawAttendanceList, searchTerm]);

  if (loading && !data) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
      </div>
    );
  }

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

      {/* Barra de Filtros e Ações Rápidas */}
      <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-500 font-semibold">
          <Filter className="w-4 h-4 text-rose-600" />
          <span>Data da Lista de Presença: <strong>{date ? formatDateBR(date) : 'Todos os Registros (Geral)'}</strong></span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-2xs text-slate-400">Selecionar data:</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>

          {date && (
            <button
              type="button"
              onClick={() => setDate('')}
              className="px-2.5 py-1 text-2xs rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition font-medium cursor-pointer"
              title="Exibir todos os registros de acolhimento"
            >
              Ver Todas
            </button>
          )}

          <button
            type="button"
            onClick={handlePrintPdf}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-2xs shadow-xs transition active:scale-95 disabled:opacity-70 cursor-pointer"
            title="Emitir PDF oficial da folha de presença do dia com linhas para assinatura"
          >
            {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
            <span>{isExporting ? 'Emitindo...' : 'Imprimir Folha de Sala'}</span>
          </button>
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

      {/* Tabela da Folha de Sala com Busca Rápida */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-rose-600" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Folha Nominal de Comparecimento e Presença
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar paciente ou CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1 text-2xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 w-48 focus:w-64 transition-all"
              />
            </div>
            <span className="text-2xs text-slate-400 shrink-0">
              {filteredAttendanceList.length} registro(s)
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[880px]">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">Ordem</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Origem</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Horário</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Paciente</th>
                <th className="py-2.5 px-3 whitespace-nowrap">CPF</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Especialidade</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">Prioridade</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredAttendanceList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Nenhum atendimento na recepção encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredAttendanceList.map((item: any, idx: number) => {
                  let statusBadge = 'bg-slate-100 text-slate-700';
                  if (item.status === 'AGUARDANDO') statusBadge = 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
                  if (item.status === 'CHAMADO' || item.status === 'EM_ATENDIMENTO') statusBadge = 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
                  if (item.status === 'FINALIZADO') statusBadge = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
                  if (item.status === 'NAO_COMPARECEU') statusBadge = 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300';

                  return (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 text-center font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {item.queue_order || idx + 1}º
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-3xs font-semibold whitespace-nowrap shrink-0 ${
                          item.origin?.includes('e-SUS')
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                        }`}>
                          {item.origin || 'SINPeP'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono text-2xs whitespace-nowrap">
                        {item.time || '--:--'}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {item.patient_name || 'Paciente Não Identificado'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono text-2xs whitespace-nowrap">
                        {item.patient_cpf ? formatCPF(item.patient_cpf) : (item.patient_cns || '-')}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap">
                        {item.specialty_name || 'Clínica Geral'}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-3xs font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 whitespace-nowrap shrink-0">
                          {item.priority || 'ELETIVO'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-3xs font-bold uppercase whitespace-nowrap shrink-0 ${statusBadge}`}>
                          {item.status === 'NAO_COMPARECEU' ? 'FALTA' : (item.status === 'FINALIZADO' ? 'ATENDIDO' : item.status)}
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

import React, { useEffect, useState } from 'react';
import { reportsService } from '../../services/reports';
import { Loader2, Building2, Calendar, Activity, XCircle, Filter } from 'lucide-react';
import { formatDateBR } from '../../utils/brazilianFormatters';

export const UnitOperationalDash: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchReport = () => {
    setLoading(true);
    reportsService
      .getUnitOperational({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
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
  }, [startDate, endDate]);

  if (loading && !data) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  const occupancy = data?.occupancy || {};
  const attendance = data?.attendance || {};
  const productionByDoctor = data?.productionByDoctor || [];
  const period = data?.period || {};

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
          Relatório de Produção Ambulatorial & Ocupação
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Indicadores de aproveitamento de vagas, absenteísmo (no-show) e produtividade do corpo clínico na unidade executante.
        </p>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-500 font-semibold">
          <Filter className="w-4 h-4 text-purple-600" />
          <span>Período da Análise: {formatDateBR(period.start)} até {formatDateBR(period.end)}</span>
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
        </div>
      </div>

      {/* Cards de Ocupação & Absenteísmo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/40">
          <div className="flex items-center justify-between text-purple-700 dark:text-purple-300 text-xs font-semibold">
            <span>Vagas Ofertadas</span>
            <Calendar className="w-4 h-4" />
          </div>
          <strong className="text-2xl font-bold text-purple-900 dark:text-purple-200 mt-2 block">
            {occupancy.totalSlots || 0}
          </strong>
          <span className="text-2xs text-purple-600 dark:text-purple-400">
            {occupancy.bookedSlots || 0} preenchidas ({occupancy.occupancyRate || 0}%)
          </span>
        </div>

        <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40">
          <div className="flex items-center justify-between text-blue-700 dark:text-blue-300 text-xs font-semibold">
            <span>Taxa de Ocupação</span>
            <Activity className="w-4 h-4" />
          </div>
          <strong className="text-2xl font-bold text-blue-900 dark:text-blue-200 mt-2 block">
            {occupancy.occupancyRate || 0}%
          </strong>
          <span className="text-2xs text-blue-600 dark:text-blue-400">
            {occupancy.availableSlots || 0} vagas ociosas
          </span>
        </div>

        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
            <span>Pacientes Atendidos</span>
            <Building2 className="w-4 h-4" />
          </div>
          <strong className="text-2xl font-bold text-emerald-900 dark:text-emerald-200 mt-2 block">
            {attendance.attended || 0}
          </strong>
          <span className="text-2xs text-emerald-600 dark:text-emerald-400">Consultas concluídas</span>
        </div>

        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40">
          <div className="flex items-center justify-between text-rose-700 dark:text-rose-300 text-xs font-semibold">
            <span>Faltas (No-Show)</span>
            <XCircle className="w-4 h-4" />
          </div>
          <strong className="text-2xl font-bold text-rose-900 dark:text-rose-200 mt-2 block">
            {attendance.noShow || 0}
          </strong>
          <span className="text-2xs text-rose-600 dark:text-rose-400">
            Taxa de absenteísmo: {attendance.noShowRate || 0}%
          </span>
        </div>
      </div>

      {/* Tabela de Produção por Profissional */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
          Produção Ambulatorial por Médico na Unidade
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Profissional Médico</th>
                <th className="py-2.5 px-3">CRM / UF</th>
                <th className="py-2.5 px-3 text-center">Vagas na Escala</th>
                <th className="py-2.5 px-3 text-center">Vagas Agendadas</th>
                <th className="py-2.5 px-3 text-center">Prontuários Concluídos</th>
                <th className="py-2.5 px-3 text-right">Taxa Preenchimento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {productionByDoctor.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Nenhum registro de produção encontrado para o período.
                  </td>
                </tr>
              ) : (
                productionByDoctor.map((doc: any, idx: number) => {
                  const slots = doc.total_slots || 0;
                  const booked = doc.booked_slots || 0;
                  const pct = slots > 0 ? Math.round((booked / slots) * 100) : 0;
                  return (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                        Dr(a). {doc.doctor_name}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-2xs text-slate-500">
                        CRM {doc.crm}/{doc.crm_state || 'UF'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-700 dark:text-slate-300">
                        {slots}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-blue-600 dark:text-blue-400">
                        {booked}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                        {doc.completed_records || 0}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="px-2 py-0.5 rounded text-3xs font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                          {pct}%
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

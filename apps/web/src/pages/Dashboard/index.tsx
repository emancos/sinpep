import { useMemo } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { usePatients } from '../../hooks/usePatients';
import { useDoctors, useCurrentDoctor } from '../../hooks/useDoctors';
import { useUsersQuery } from '../../hooks/useUsers';
import { useRecentMedicalRecords } from '../../hooks/useMedicalRecords';
import { useProcedures } from '../../hooks/useProcedures';
import { getReceptionSchedule } from '../../services/reception';
import {
  Building,
  Stethoscope,
  Users,
  Activity,
  ArrowRight,
  UserPlus,
  ClipboardList,
  CalendarCheck,
  FileText,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function formatCpf(cpf?: string) {
  if (!cpf) return 'N/A';
  const clean = cpf.replace(/\D/g, '');
  if (clean.length === 11) {
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  return cpf;
}

function formatDate(dateString?: string) {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

interface StatItem {
  name: string;
  value: number;
  icon: any;
  color: string;
  link: string;
  loading: boolean;
  description?: string;
}

export function Dashboard() {
  const { user } = useAuthStore();
  const token = useAuthStore((state) => state.token);

  // Perfil do médico autenticado (se houver)
  const { data: currentDoctor } = useCurrentDoctor();
  const isDoctor = Boolean(currentDoctor?.id);

  // Dados para Dashboard do Médico
  const { data: recentRecordsData, isLoading: isLoadingRecentRecords } = useRecentMedicalRecords();
  const today = new Date().toISOString().split('T')[0];
  const { data: scheduleData, isLoading: isLoadingSchedule } = useQuery({
    queryKey: ['reception-schedule-dashboard', today],
    queryFn: () => getReceptionSchedule(today, '2606712', token!),
    enabled: !!token && isDoctor,
  });

  // Cálculo de pacientes agendados hoje para a especialidade do médico
  const scheduledCount = useMemo(() => {
    if (!scheduleData) return 0;
    const doctorSpecialtyNames = (currentDoctor?.doctorSpecialties || [])
      .map((ds: any) => ds.specialty?.name?.toLowerCase().trim())
      .filter(Boolean);

    let count = 0;
    Object.entries(scheduleData).forEach(([specialtyName, patients]: [string, any]) => {
      if (!Array.isArray(patients)) return;
      if (
        doctorSpecialtyNames.length === 0 ||
        doctorSpecialtyNames.includes(specialtyName.toLowerCase().trim())
      ) {
        count += patients.length;
      }
    });
    return count;
  }, [scheduleData, currentDoctor]);

  // Procedimentos disponíveis para consulta
  const { data: proceduresData, isLoading: isLoadingProcedures } = useProcedures({
    page: 1,
    limit: 1,
  });

  // Estatísticas gerais
  const { data: patientsData, isLoading: isLoadingPatients } = usePatients({ page: 1, limit: 5 });
  const { data: doctorsData, isLoading: isLoadingDoctors } = useDoctors({ page: 1, limit: 1 });
  const { data: usersData, isLoading: isLoadingUsers } = useUsersQuery();

  const { data: medicalRecordsCount, isLoading: isLoadingRecords } = useQuery({
    queryKey: ['medical-records-count'],
    queryFn: async () => {
      const res = await axios.get(`${apiUrl}/medical-records/count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    },
    enabled: !!token && !isDoctor,
  });

  // Configuração dos stats para médico vs administrador
  const doctorStats: StatItem[] = [
    {
      name: 'Pacientes na Agenda Hoje',
      value: scheduledCount,
      icon: CalendarCheck,
      color: 'bg-blue-600',
      link: '/reception',
      loading: isLoadingSchedule,
      description: 'Atendimentos agendados hoje',
    },
    {
      name: 'Prontuários da Especialidade',
      value: recentRecordsData?.total || 0,
      icon: ClipboardList,
      color: 'bg-indigo-600',
      link: '/medical-records',
      loading: isLoadingRecentRecords,
      description: recentRecordsData?.specialties?.join(', ') || 'Sua especialidade',
    },
    {
      name: 'Procedimentos para Consulta',
      value: proceduresData?.total || 0,
      icon: Stethoscope,
      color: 'bg-emerald-600',
      link: '/procedures',
      loading: isLoadingProcedures,
      description: 'Catálogo de procedimentos',
    },
    {
      name: 'Pacientes Cadastrados',
      value: patientsData?.total || 0,
      icon: Users,
      color: 'bg-amber-600',
      link: '/patients',
      loading: isLoadingPatients,
      description: 'Total no sistema',
    },
  ];

  const adminStats: StatItem[] = [
    {
      name: 'Pacientes',
      value: patientsData?.total || 0,
      icon: Users,
      color: 'bg-blue-500',
      link: '/patients',
      loading: isLoadingPatients,
      description: 'Total de cadastros',
    },
    {
      name: 'Médicos',
      value: doctorsData?.total || 0,
      icon: Stethoscope,
      color: 'bg-emerald-500',
      link: '/doctors',
      loading: isLoadingDoctors,
      description: 'Corpo clínico ativo',
    },
    {
      name: 'Prontuários',
      value: medicalRecordsCount?.total || 0,
      icon: ClipboardList,
      color: 'bg-amber-500',
      link: '/medical-records',
      loading: isLoadingRecords,
      description: 'Registros gerais',
    },
    {
      name: 'Usuários',
      value: usersData?.length || 0,
      icon: Activity,
      color: 'bg-purple-500',
      link: '/users',
      loading: isLoadingUsers,
      description: 'Contas de acesso',
    },
  ];

  const stats = isDoctor ? doctorStats : adminStats;

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Banner de Boas-vindas Personalizado */}
      {isDoctor ? (
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white p-6 sm:p-8 rounded-2xl shadow-lg border border-blue-700/50">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/30 text-blue-200 border border-blue-400/30 backdrop-blur-sm">
                  <Sparkles className="w-3.5 h-3.5 text-blue-300" />
                  Painel Clínico
                </span>
                {currentDoctor?.crm && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/10 text-white border border-white/20">
                    CRM {currentDoctor.crm}/{currentDoctor.crmState}
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Olá, Dr(a). {currentDoctor?.name || user?.name}!
              </h1>
              <p className="text-blue-100/90 text-sm sm:text-base max-w-2xl">
                Acompanhe os atendimentos da sua especialidade, consulte prontuários clínicos e verifique a fila de espera do dia.
              </p>
              {currentDoctor?.doctorSpecialties && currentDoctor.doctorSpecialties.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-xs text-blue-200 font-medium">Especialidade(s):</span>
                  {currentDoctor.doctorSpecialties.map((ds: any) => (
                    <span
                      key={ds.specialtyId || ds.specialty?.id}
                      className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-500/20 text-white border border-blue-400/30"
                    >
                      {ds.specialty?.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/reception"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-blue-900 hover:bg-blue-50 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
              >
                <CalendarCheck className="w-5 h-5 text-blue-700" />
                <span>Fila de Atendimento</span>
              </Link>
              <Link
                to="/medical-records"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-700/60 hover:bg-blue-700 text-white rounded-xl font-medium transition-all border border-blue-500/40 backdrop-blur-sm"
              >
                <ClipboardList className="w-5 h-5" />
                <span>Prontuários</span>
              </Link>
            </div>
          </div>
          {/* Subtle decoration */}
          <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Olá, {user?.name}!</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Aqui está o resumo do seu sistema hoje.</p>
          </div>
          <Link
            to="/patients"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0051A2] hover:bg-[#003B77] text-white rounded-lg font-medium transition-colors shadow-sm"
          >
            <UserPlus className="w-5 h-5" />
            <span>Novo Paciente</span>
          </Link>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {stats.map((stat, i) => (
          <Link
            key={i}
            to={stat.link}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all group flex flex-col justify-between"
          >
            <div className="flex items-center gap-4">
              <div
                className={`${stat.color} w-12 h-12 rounded-lg flex items-center justify-center text-white shrink-0 group-hover:scale-110 transition-transform shadow-sm`}
              >
                <stat.icon className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">
                  {stat.name}
                </p>
                {stat.loading ? (
                  <div className="h-7 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mt-1" />
                ) : (
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{stat.value}</h3>
                )}
              </div>
            </div>
            {stat.description && (
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 truncate">
                {stat.description}
              </p>
            )}
          </Link>
        ))}
      </div>

      {/* Se for Médico: Prontuários da Especialidade. Se Administrador: Pacientes Recentes */}
      {isDoctor ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                  Prontuários da sua Especialidade
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Atendimentos mais recentes realizados para{' '}
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {recentRecordsData?.specialties?.join(', ') || 'sua área'}
                  </span>
                </p>
              </div>
            </div>
            <Link
              to="/medical-records"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 self-start sm:self-auto"
            >
              Ver todos os prontuários <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="p-0">
            {isLoadingRecentRecords ? (
              <div className="p-8 text-center text-slate-500">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent mb-2" />
                <p>Carregando prontuários da especialidade...</p>
              </div>
            ) : recentRecordsData?.data && recentRecordsData.data.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {recentRecordsData.data.map((record) => {
                  const doctorSpecialties = record.doctor?.doctors?.[0]?.doctorSpecialties
                    ?.map((ds: any) => ds.specialty?.name)
                    .filter(Boolean)
                    .join(', ');

                  return (
                    <div
                      key={record.id}
                      className="p-5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 font-bold text-sm">
                          {record.patient?.name?.charAt(0)?.toUpperCase() || 'P'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              to={`/medical-records/${record.patientId}`}
                              className="font-semibold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            >
                              {record.patient?.name}
                            </Link>
                            {record.cid10 && (
                              <span className="px-2 py-0.5 text-xs font-semibold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded border border-indigo-200 dark:border-indigo-800">
                                CID: {record.cid10}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-500 dark:text-slate-400">
                            <span className="font-mono">CPF: {formatCpf(record.patient?.cpf)}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Building className="w-3.5 h-3.5" />
                              {record.patient?.healthCenter?.name || 'Sem UBS vinculada'}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {formatDate(record.recordDate || record.createdAt)}
                            </span>
                          </div>

                          {record.observation && (
                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 line-clamp-2 bg-slate-50 dark:bg-slate-800/60 p-2 rounded border border-slate-100 dark:border-slate-800">
                              <span className="font-medium text-slate-500 dark:text-slate-400">Resumo: </span>
                              {record.observation}
                            </p>
                          )}

                          <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                            <span className="font-medium text-slate-600 dark:text-slate-400">
                              Atendido por Dr(a). {record.doctor?.name}
                            </span>
                            {record.doctor?.doctors?.[0]?.crm && (
                              <span className="text-slate-400">
                                (CRM {record.doctor.doctors[0].crm}/{record.doctor.doctors[0].crmState})
                              </span>
                            )}
                            {doctorSpecialties && (
                              <span className="text-slate-400">• {doctorSpecialties}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 self-end lg:self-center">
                        <Link
                          to={`/medical-records/${record.patientId}`}
                          className="px-4 py-2 text-xs font-semibold bg-[#0051A2] hover:bg-[#003B77] text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                        >
                          <FileText className="w-4 h-4" />
                          <span>Abrir Prontuário</span>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center">
                <ClipboardList className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
                  Nenhum prontuário registrado ainda
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                  Os prontuários clínicos dos pacientes atendidos na sua especialidade aparecerão listados aqui.
                </p>
                <Link
                  to="/reception"
                  className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <CalendarCheck className="w-4 h-4" />
                  <span>Ver Fila de Hoje</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Pacientes Recentes (Visão do Administrador) */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-slate-500" />
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                Pacientes Recentes
              </h2>
            </div>
            <Link
              to="/patients"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
            >
              Ver todos <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="p-0">
            {isLoadingPatients ? (
              <div className="p-8 text-center text-slate-500">Carregando pacientes...</div>
            ) : patientsData?.data && patientsData.data.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {patientsData.data.map((patient) => (
                  <div
                    key={patient.id}
                    className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                        <UserPlus className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800 dark:text-slate-200">{patient.name}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                          <span className="font-mono">{formatCpf(patient.cpf)}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Building className="w-3 h-3" />{' '}
                            {patient.healthCenter?.name || 'Sem UBS'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Link
                      to={`/medical-records/${patient.id}`}
                      className="px-3 py-1.5 text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                    >
                      Prontuário
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500">Nenhum paciente cadastrado ainda.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


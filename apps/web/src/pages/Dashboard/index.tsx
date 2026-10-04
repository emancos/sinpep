import { useAuthStore } from '../../store/useAuthStore';
import { usePatients } from '../../hooks/usePatients';
import { useDoctors } from '../../hooks/useDoctors';
import { useHealthCenters } from '../../hooks/useHealthCenters';
import { useUsersQuery } from '../../hooks/useUsers';
import { Building, Stethoscope, Users, Activity, ArrowRight, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Dashboard() {
  const { user } = useAuthStore();

  // Fetching real data using existing paginated endpoints (fetching just 1 page to get the totals)
  const { data: patientsData, isLoading: isLoadingPatients } = usePatients({ page: 1, limit: 5 });
  const { data: doctorsData, isLoading: isLoadingDoctors } = useDoctors({ page: 1, limit: 1 });
  const { data: healthCentersData, isLoading: isLoadingHCs } = useHealthCenters({ page: 1, limit: 1 });
  const { data: usersData, isLoading: isLoadingUsers } = useUsersQuery();

  const stats = [
    { name: 'Pacientes', value: patientsData?.total || 0, icon: Users, color: 'bg-blue-500', link: '/patients', loading: isLoadingPatients },
    { name: 'Médicos', value: doctorsData?.total || 0, icon: Stethoscope, color: 'bg-emerald-500', link: '/doctors', loading: isLoadingDoctors },
    { name: 'Unidades de Saúde', value: healthCentersData?.total || 0, icon: Building, color: 'bg-amber-500', link: '/health-centers', loading: isLoadingHCs },
    { name: 'Usuários', value: usersData?.length || 0, icon: Activity, color: 'bg-purple-500', link: '/users', loading: isLoadingUsers },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
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

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {stats.map((stat, i) => (
          <Link key={i} to={stat.link} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all group">
            <div className="flex items-center gap-4">
              <div className={`${stat.color} w-12 h-12 rounded-lg flex items-center justify-center text-white shrink-0 group-hover:scale-110 transition-transform`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.name}</p>
                {stat.loading ? (
                  <div className="h-7 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mt-1" />
                ) : (
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{stat.value}</h3>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Patients */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-500" />
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Pacientes Recentes</h2>
          </div>
          <Link to="/patients" className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1">
            Ver todos <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="p-0">
          {isLoadingPatients ? (
            <div className="p-8 text-center text-slate-500">Carregando pacientes...</div>
          ) : patientsData?.data && patientsData.data.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {patientsData.data.map(patient => (
                <div key={patient.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                      <UserPlus className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 dark:text-slate-200">{patient.name}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                        <span className="font-mono">{patient.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Building className="w-3 h-3"/> {patient.healthCenter?.name || 'Sem UBS'}</span>
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
    </div>
  );
}

import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, User, FileText, CheckCircle2, ShieldAlert, HeartPulse, Building2, Stethoscope, Hash, MapPin, Activity } from 'lucide-react';
import { useDoctor } from '../../hooks/useDoctors';
import { useAuthStore } from '../../store/useAuthStore';

export const DoctorDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const userPermissions = useAuthStore((state) => state.permissions || []);
  const { data: doctor, isLoading, error } = useDoctor(id);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-500 font-medium">Carregando detalhes do médico...</p>
      </div>
    );
  }

  if (error || !doctor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-rose-500">
        <ShieldAlert className="w-16 h-16 mb-4 opacity-50" />
        <h2 className="text-xl font-bold">Médico não encontrado</h2>
        <p className="text-slate-500 mb-6">O registro que você está tentando acessar não existe ou foi removido.</p>
        <button
          onClick={() => navigate('/doctors')}
          className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          Voltar para Lista
        </button>
      </div>
    );
  }

  const attendanceLabels: Record<string, string> = {
    'CONSULTA': 'Apenas Consultas',
    'EXAME': 'Apenas Exames',
    'AMBOS': 'Consultas e Exames'
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/doctors')}
            className="p-2.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
            title="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center shadow-inner">
              <User className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {doctor.user?.name || doctor.name}
                {!doctor.isActive && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-rose-100 text-rose-700 rounded-md">Inativo</span>
                )}
              </h1>
              <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
                <Hash className="w-3.5 h-3.5" />
                CRM {doctor.crm}/{doctor.crmState}
              </p>
            </div>
          </div>
        </div>

        {userPermissions.includes('doctors:write') && (
          <button
            onClick={() => navigate(`/doctors/${doctor.id}/edit`)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-95"
          >
            <Edit className="w-4 h-4" />
            <span>Editar Médico</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Esquerda - Informações Principais */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Dados Pessoais */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                Dados de Identificação
              </h2>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Nome Completo</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{doctor.user?.name || doctor.name}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">CPF</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{doctor.cpf || doctor.user?.cpf || 'Não informado'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">CNS (Cartão Nacional de Saúde)</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{doctor.cns || 'Não informado'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">E-mail (Acesso)</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{doctor.user?.email || 'Não informado'}</p>
              </div>
            </div>
          </div>

          {/* Atuação e Especialidades */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-indigo-500" />
                Atuação Profissional
              </h2>
            </div>
            <div className="p-6 space-y-6">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Tipo de Atendimento</p>
                  <p className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-sm font-semibold">
                    <Activity className="w-3.5 h-3.5" />
                    {doctor.attendanceType ? attendanceLabels[doctor.attendanceType] || doctor.attendanceType : 'Não informado'}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500 mb-2">Especialidades (CBO)</p>
                {doctor.doctorSpecialties && doctor.doctorSpecialties.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {doctor.doctorSpecialties.map((ds: any) => (
                      <span key={ds.specialtyId} className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-sm rounded-lg border border-indigo-100 dark:border-indigo-500/20 font-medium flex items-center gap-1.5">
                        <HeartPulse className="w-3.5 h-3.5" />
                        {ds.specialty.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">Nenhuma especialidade registrada</p>
                )}
              </div>

              {doctor.doctorProcedures && doctor.doctorProcedures.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-2">Procedimentos Autorizados</p>
                  <div className="flex flex-wrap gap-2">
                    {doctor.doctorProcedures.map((dp: any) => (
                      <span key={dp.procedureId} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded border border-slate-200 dark:border-slate-700">
                        {dp.procedure.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Coluna Direita - Vínculos */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-emerald-50/50 dark:bg-emerald-900/10">
              <h2 className="text-sm font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Vínculo Institucional
              </h2>
            </div>
            <div className="p-6">
              {doctor.user?.healthCenter ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                        {doctor.user.healthCenter.name || doctor.user.healthCenter.noFantasia}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <Hash className="w-3 h-3" />
                        CNES: {doctor.user.healthCenter.cnes}
                      </p>
                    </div>
                  </div>
                  
                  {(doctor.user.healthCenter.noMunicipio || doctor.user.healthCenter.sgUf) && (
                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{doctor.user.healthCenter.noLogradouro ? `${doctor.user.healthCenter.noLogradouro}, ` : ''}{doctor.user.healthCenter.noBairro ? `${doctor.user.healthCenter.noBairro}, ` : ''}{doctor.user.healthCenter.noMunicipio} - {doctor.user.healthCenter.sgUf}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center text-center py-4">
                  <ShieldAlert className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Sem Vínculo</p>
                  <p className="text-xs text-slate-500 mt-1">O médico não está atrelado a nenhuma unidade de saúde neste sistema.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

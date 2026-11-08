import React from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useDashboardSummary } from '../../hooks/useDashboard';
import { NoticeBoard } from './components/NoticeBoard';
import { AdminDashboard } from './components/AdminDashboard';
import { RegulatorDashboard } from './components/RegulatorDashboard';
import { SolicitorDashboard } from './components/SolicitorDashboard';
import { CoordinatorDashboard } from './components/CoordinatorDashboard';
import { DoctorDashboard } from './components/DoctorDashboard';
import { ReceptionistDashboard } from './components/ReceptionistDashboard';

export const Dashboard: React.FC = () => {
  const { permissions, activeProfile } = useAuthStore();
  const { data: summary, isLoading } = useDashboardSummary();

  const profileName = activeProfile?.name || '';
  const isAdmin = permissions.includes('admin:access') || profileName === 'Administrador';
  const isRegulator = profileName === 'Regulador (Central de Regulação)';
  const isSolicitor = profileName.includes('Solicitante');
  const isCoordinator = profileName === 'Coordenador de Unidade';
  const isDoctor = profileName === 'Médico';
  const isReceptionist = profileName === 'Recepcionista';

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-10">
      {/* 1. Mural de Avisos e Comunicação (Integrado a todos os perfis) */}
      <NoticeBoard />

      {/* 2. Dashboard Contextualizado por Perfil */}
      {isAdmin ? (
        <AdminDashboard summary={summary} isLoading={isLoading} />
      ) : isRegulator ? (
        <RegulatorDashboard summary={summary} isLoading={isLoading} />
      ) : isSolicitor ? (
        <SolicitorDashboard summary={summary} isLoading={isLoading} />
      ) : isCoordinator ? (
        <CoordinatorDashboard summary={summary} isLoading={isLoading} />
      ) : isDoctor ? (
        <DoctorDashboard summary={summary} isLoading={isLoading} />
      ) : isReceptionist ? (
        <ReceptionistDashboard summary={summary} isLoading={isLoading} />
      ) : (
        /* Administrador ou padrão */
        <AdminDashboard summary={summary} isLoading={isLoading} />
      )}
    </div>
  );
};

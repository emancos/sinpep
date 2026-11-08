import { useState, useRef, useMemo, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import {
  Activity,
  Users,
  Stethoscope,
  Pill,
  Download,
  Loader2,
  Layers,
  Send,
  Building2,
  CalendarCheck,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { EpidemiologicalDash } from './EpidemiologicalDash';
import { OperationalDash } from './OperationalDash';
import { ProceduresDash } from './ProceduresDash';
import { PharmacyDash } from './PharmacyDash';
import { RegulationDash } from './RegulationDash';
import { SolicitorDash } from './SolicitorDash';
import { UnitOperationalDash } from './UnitOperationalDash';
import { DoctorProductionDash } from './DoctorProductionDash';
import { ReceptionAttendanceDash } from './ReceptionAttendanceDash';
import { formatDateBR } from '../../utils/brazilianFormatters';

interface ReportTab {
  id: string;
  label: string;
  icon: any;
}

export const Reports = () => {
  const { activeProfile, permissions } = useAuthStore();
  const profileName = activeProfile?.name || '';
  const isAdmin = permissions.includes('admin:access') || profileName === 'Administrador';
  const isRegulator = profileName === 'Regulador (Central de Regulação)';
  const isSolicitor = profileName.includes('Solicitante');
  const isCoordinator = profileName === 'Coordenador de Unidade';
  const isDoctor = profileName === 'Médico';
  const isReceptionist = profileName === 'Recepcionista';

  // Configuração dinâmica das abas com base nas atribuições do perfil
  const availableTabs: ReportTab[] = useMemo(() => {
    if (isAdmin) {
      return [
        { id: 'epidemiological', label: 'Epidemiológico', icon: Users },
        { id: 'operational', label: 'Operacional Global', icon: Activity },
        { id: 'regulation', label: 'Central de Regulação', icon: Layers },
        { id: 'unit-operational', label: 'Produção Ambulatorial', icon: Building2 },
        { id: 'procedures', label: 'Procedimentos & Exames', icon: Stethoscope },
        { id: 'pharmacy', label: 'Farmácia & Medicamentos', icon: Pill },
        { id: 'solicitor', label: 'Encaminhamentos UBS', icon: Send },
        { id: 'reception-attendance', label: 'Folha de Presença', icon: CalendarCheck },
      ];
    }

    if (isRegulator) {
      return [
        { id: 'regulation', label: 'Central de Regulação', icon: Layers },
        { id: 'epidemiological', label: 'Perfil Epidemiológico', icon: Users },
        { id: 'procedures', label: 'Procedimentos & Exames', icon: Stethoscope },
      ];
    }

    if (isSolicitor) {
      return [
        { id: 'solicitor', label: 'Encaminhamentos da UBS', icon: Send },
      ];
    }

    if (isCoordinator) {
      return [
        { id: 'unit-operational', label: 'Produção Ambulatorial', icon: Building2 },
        { id: 'reception-attendance', label: 'Folha de Presença da Unidade', icon: CalendarCheck },
      ];
    }

    if (isDoctor) {
      return [
        { id: 'doctor-production', label: 'Minha Produção Clínica', icon: Stethoscope },
        { id: 'epidemiological', label: 'Perfil Epidemiológico Geral', icon: Users },
      ];
    }

    if (isReceptionist) {
      return [
        { id: 'reception-attendance', label: 'Folha de Presença & Acolhimento', icon: CalendarCheck },
      ];
    }

    // Padrão geral
    return [
      { id: 'epidemiological', label: 'Epidemiológico', icon: Users },
      { id: 'operational', label: 'Operacional', icon: Activity },
    ];
  }, [isAdmin, isRegulator, isSolicitor, isCoordinator, isDoctor, isReceptionist]);

  const [activeTab, setActiveTab] = useState<string>(() => availableTabs[0]?.id || 'epidemiological');
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // Garante que o activeTab seja sempre válido para o perfil atual
  useEffect(() => {
    if (!availableTabs.some((t) => t.id === activeTab)) {
      setActiveTab(availableTabs[0]?.id || 'epidemiological');
    }
  }, [availableTabs, activeTab]);

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, logging: false });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4'); // Portrait A4
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`relatorio-${activeTab}-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Failed to export PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-2xs font-bold uppercase tracking-wider bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
              {profileName || 'Relatórios do Sistema'}
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
            Relatórios & BI
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Analise os dados analíticos pertinentes ao seu perfil e exporte os painéis para PDF.
          </p>
        </div>
        <button
          onClick={handleExportPDF}
          disabled={isExporting}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#0051A2] hover:bg-[#003B77] text-white rounded-lg font-semibold shadow-md transition-all active:scale-95 disabled:opacity-70 cursor-pointer"
        >
          {isExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
          {isExporting ? 'Processando PDF...' : 'Exportar Visão Atual'}
        </button>
      </div>

      {/* Modern Segmented Control */}
      <div className="p-1.5 bg-slate-200/70 dark:bg-slate-800/80 rounded-xl inline-flex flex-wrap lg:flex-nowrap w-full lg:w-auto shadow-inner border border-slate-300/50 dark:border-slate-700/50 gap-1">
        {availableTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all duration-300 cursor-pointer ${
                isActive
                  ? 'bg-white dark:bg-slate-900 text-[#003B77] dark:text-blue-400 shadow-md transform scale-[1.02]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-300/30 dark:hover:bg-slate-700/30'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'animate-pulse' : ''}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Report Canvas */}
      <div className="bg-slate-50 dark:bg-slate-950/40 rounded-2xl p-2">
        <div
          ref={reportRef}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 lg:p-8 shadow-xl min-h-[600px]"
        >
          {/* Cabeçalho apenas para o PDF */}
          <div className="hidden pdf-only:block mb-8 pb-4 border-b border-slate-200">
            <h2 className="text-2xl font-bold text-slate-800">SINPeP - Relatório de Inteligência em Saúde</h2>
            <p className="text-slate-500">
              Perfil: {profileName} • Gerado em {formatDateBR(new Date())}
            </p>
          </div>

          {activeTab === 'epidemiological' && <EpidemiologicalDash />}
          {activeTab === 'operational' && <OperationalDash />}
          {activeTab === 'regulation' && <RegulationDash />}
          {activeTab === 'solicitor' && <SolicitorDash />}
          {activeTab === 'unit-operational' && <UnitOperationalDash />}
          {activeTab === 'doctor-production' && <DoctorProductionDash />}
          {activeTab === 'reception-attendance' && <ReceptionAttendanceDash />}
          {activeTab === 'procedures' && <ProceduresDash />}
          {activeTab === 'pharmacy' && <PharmacyDash />}
        </div>
      </div>
    </div>
  );
};

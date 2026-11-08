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
  ChevronLeft,
  ChevronRight,
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

  // Controle de scroll horizontal sem quebra de linha com detecção via ResizeObserver
  const tabsTrackRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const checkScrollability = () => {
    const el = tabsTrackRef.current;
    if (!el) return;
    const canScrollLeft = el.scrollLeft > 2;
    const canScrollRight = Math.ceil(el.scrollLeft + el.clientWidth) < el.scrollWidth - 2;
    setShowLeftArrow(canScrollLeft);
    setShowRightArrow(canScrollRight);
  };

  useEffect(() => {
    const el = tabsTrackRef.current;
    if (!el) return;

    checkScrollability();
    const ro = new ResizeObserver(() => {
      checkScrollability();
    });
    ro.observe(el);

    const timer = setTimeout(checkScrollability, 150);
    return () => {
      ro.disconnect();
      clearTimeout(timer);
    };
  }, [availableTabs]);

  // Garante que o activeTab seja sempre válido para o perfil atual
  useEffect(() => {
    if (!availableTabs.some((t) => t.id === activeTab)) {
      setActiveTab(availableTabs[0]?.id || 'epidemiological');
    }
  }, [availableTabs, activeTab]);

  const handleTabSelect = (tabId: string) => {
    setActiveTab(tabId);
    const tabEl = tabsTrackRef.current?.querySelector(`[data-tab-id="${tabId}"]`) as HTMLElement | null;
    if (tabEl) {
      tabEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  };

  const handleScroll = (direction: 'left' | 'right') => {
    const el = tabsTrackRef.current;
    if (!el) return;
    const scrollAmount = direction === 'left' ? -260 : 260;
    el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    setTimeout(checkScrollability, 300);
  };

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
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-2xs font-bold uppercase tracking-wider bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
              {profileName || 'Relatórios do Sistema'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Relatórios & BI
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Analise os dados analíticos pertinentes ao seu perfil e exporte os painéis para PDF.
          </p>
        </div>
        <button
          onClick={handleExportPDF}
          disabled={isExporting}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0051A2] hover:bg-[#003B77] text-white rounded-xl font-semibold shadow-sm transition-all active:scale-95 disabled:opacity-70 cursor-pointer text-xs self-start lg:self-auto"
        >
          {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          <span>{isExporting ? 'Processando PDF...' : 'Exportar Visão Atual'}</span>
        </button>
      </div>

      {/* Modern Underline Tab Bar with Horizontal Smooth Scroll & Fade Indicators */}
      <div className="relative border-b border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 rounded-t-xl px-1 sm:px-2">
        {/* Seta e fade esquerdo */}
        {showLeftArrow && (
          <>
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-14 bg-gradient-to-r from-white dark:from-slate-900 via-white/80 dark:via-slate-900/80 to-transparent z-10" />
            <button
              type="button"
              onClick={() => handleScroll('left')}
              className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
              title="Rolar abas para a esquerda"
              aria-label="Rolar abas para a esquerda"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Trilha horizontal das abas */}
        <div
          ref={tabsTrackRef}
          onScroll={checkScrollability}
          className="flex items-center gap-1.5 sm:gap-3 overflow-x-auto scroll-smooth w-full pt-1 pb-0 pr-12 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {availableTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                data-tab-id={tab.id}
                onClick={() => handleTabSelect(tab.id)}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer select-none rounded-t-lg -mb-[2px] ${
                  isActive
                    ? 'border-[#0051A2] text-[#0051A2] dark:text-blue-400 dark:border-blue-500 bg-blue-50/70 dark:bg-blue-950/40'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-[#0051A2] dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Seta e fade direito */}
        {showRightArrow && (
          <>
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-14 bg-gradient-to-l from-white dark:from-slate-900 via-white/80 dark:via-slate-900/80 to-transparent z-10" />
            <button
              type="button"
              onClick={() => handleScroll('right')}
              className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
              title="Rolar abas para a direita"
              aria-label="Rolar abas para a direita"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}
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

import { useState, useRef, useMemo, useEffect } from 'react';
import {
  Activity,
  Users,
  Stethoscope,
  Pill,
  Download,
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
import { ReportExportModal } from './components/ReportExportModal';
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
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // Controle de scroll horizontal sem quebra de linha com detecção via ResizeObserver
  const tabsTrackRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  // Suporte a drag-to-scroll com mouse
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);

  const checkScrollability = () => {
    const el = tabsTrackRef.current;
    if (!el) return;
    const canScrollLeft = el.scrollLeft > 4;
    const canScrollRight = Math.ceil(el.scrollLeft + el.clientWidth) < el.scrollWidth - 4;
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
    const scrollAmount = direction === 'left' ? -240 : 240;
    el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    setTimeout(checkScrollability, 300);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const el = tabsTrackRef.current;
    if (!el) return;
    isDraggingRef.current = true;
    startXRef.current = e.pageX - el.offsetLeft;
    scrollLeftRef.current = el.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const el = tabsTrackRef.current;
    if (!el) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    el.scrollLeft = scrollLeftRef.current - walk;
    checkScrollability();
  };

  const handleMouseUpOrLeave = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    const el = tabsTrackRef.current;
    if (!el) return;
    if (el.scrollWidth > el.clientWidth) {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        el.scrollLeft += e.deltaY;
        checkScrollability();
      }
    }
  };

  const currentTabObj = availableTabs.find((t) => t.id === activeTab);

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
            Analise os dados analíticos pertinentes ao seu perfil e exporte relatórios oficiais multipáginas em PDF ou planilhas Excel.
          </p>
        </div>

        <button
          onClick={() => setIsExportModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0051A2] hover:bg-[#003B77] text-white rounded-xl font-semibold shadow-sm transition-all active:scale-95 cursor-pointer text-xs self-start lg:self-auto"
        >
          <Download className="w-4 h-4" />
          <span>Exportar Relatório Oficial</span>
        </button>
      </div>

      {/* Modern Segmented Tab Bar com Rolagem Horizontal Suave Contida e Setas Integradas */}
      <div className="relative w-full bg-slate-200/70 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-300/60 dark:border-slate-700/60 shadow-inner overflow-hidden">
        {/* Seta e fade esquerdo */}
        {showLeftArrow && (
          <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center pl-1.5 pr-4 bg-gradient-to-r from-slate-200/95 dark:from-slate-800 via-slate-200/90 dark:via-slate-800/90 to-transparent">
            <button
              type="button"
              onClick={() => handleScroll('left')}
              className="w-7 h-7 flex items-center justify-center rounded-xl bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-sm border border-slate-200 dark:border-slate-600 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              title="Rolar abas para a esquerda"
              aria-label="Rolar abas para a esquerda"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Trilha de abas rolável */}
        <div
          ref={tabsTrackRef}
          onScroll={checkScrollability}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          onWheel={handleWheel}
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-0.5 px-0.5 cursor-grab active:cursor-grabbing select-none"
        >
          {availableTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                data-tab-id={tab.id}
                type="button"
                onClick={() => handleTabSelect(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-white dark:bg-slate-900 text-[#0051A2] dark:text-blue-400 shadow-sm ring-1 ring-slate-900/5 dark:ring-white/10'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-800/40'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#0051A2] dark:text-blue-400' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Seta e fade direito */}
        {showRightArrow && (
          <div className="absolute right-0 top-0 bottom-0 z-10 flex items-center pr-1.5 pl-4 bg-gradient-to-l from-slate-200/95 dark:from-slate-800 via-slate-200/90 dark:via-slate-800/90 to-transparent">
            <button
              type="button"
              onClick={() => handleScroll('right')}
              className="w-7 h-7 flex items-center justify-center rounded-xl bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-sm border border-slate-200 dark:border-slate-600 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              title="Rolar abas para a direita"
              aria-label="Rolar abas para a direita"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Report Canvas */}
      <div className="bg-slate-50 dark:bg-slate-950/40 rounded-2xl p-2">
        <div
          ref={reportRef}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 lg:p-8 shadow-xl min-h-[600px]"
        >
          {/* Cabeçalho apenas para o PDF / Print */}
          <div className="hidden print:block mb-8 pb-4 border-b border-slate-200">
            <h2 className="text-2xl font-bold text-slate-800">SINPeP - Sistema Integrado de Regulação e Prontuário Eletrônico do Paciente</h2>
            <p className="text-slate-500">
              Painel: {currentTabObj?.label} • Perfil: {profileName} • Gerado em {formatDateBR(new Date())}
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

      {/* Modal de Exportação Oficial */}
      <ReportExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        activeTab={activeTab}
        activeTabLabel={currentTabObj?.label || 'Relatório'}
      />
    </div>
  );
};

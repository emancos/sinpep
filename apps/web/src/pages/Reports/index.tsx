import { useState, useRef } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Activity, Users, Stethoscope, Pill, Download, Loader2 } from 'lucide-react';
import { EpidemiologicalDash } from './EpidemiologicalDash';
import { OperationalDash } from './OperationalDash';
import { ProceduresDash } from './ProceduresDash';
import { PharmacyDash } from './PharmacyDash';
import { formatDateBR } from '../../utils/brazilianFormatters';

export const Reports = () => {
  const [activeTab, setActiveTab] = useState('epidemiological');
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const tabs = [
    { id: 'epidemiological', label: 'Epidemiológico', icon: Users },
    { id: 'operational', label: 'Operacional', icon: Activity },
    { id: 'procedures', label: 'Procedimentos', icon: Stethoscope },
    { id: 'pharmacy', label: 'Farmácia', icon: Pill },
  ];

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
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
            Relatórios & BI
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Analise os dados da unidade e exporte os painéis para PDF.</p>
        </div>
        <button
          onClick={handleExportPDF}
          disabled={isExporting}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#0051A2] hover:bg-[#003B77] text-white rounded-lg font-semibold shadow-md transition-all active:scale-95 disabled:opacity-70"
        >
          {isExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
          {isExporting ? 'Processando PDF...' : 'Exportar Visão Atual'}
        </button>
      </div>

      {/* Modern Segmented Control */}
      <div className="p-1.5 bg-slate-200/70 dark:bg-slate-800/80 rounded-xl inline-flex flex-wrap lg:flex-nowrap w-full lg:w-auto shadow-inner border border-slate-300/50 dark:border-slate-700/50">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all duration-300 ${isActive ? 'bg-white dark:bg-slate-900 text-[#003B77] dark:text-blue-400 shadow-md transform scale-[1.02]' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-300/30 dark:hover:bg-slate-700/30'}`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'animate-pulse' : ''}`} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Report Canvas */}
      <div className="bg-slate-50 dark:bg-slate-950/40 rounded-2xl p-2">
        <div ref={reportRef} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 lg:p-8 shadow-xl min-h-[600px]">
          {/* Cabecalho apenas para o PDF */}
          <div className="hidden pdf-only:block mb-8 pb-4 border-b border-slate-200">
            <h2 className="text-2xl font-bold text-slate-800">SINPeP - Relatório de Inteligência</h2>
            <p className="text-slate-500">Gerado em {formatDateBR(new Date())}</p>
          </div>

          {activeTab === 'epidemiological' && <EpidemiologicalDash />}
          {activeTab === 'operational' && <OperationalDash />}
          {activeTab === 'procedures' && <ProceduresDash />}
          {activeTab === 'pharmacy' && <PharmacyDash />}
        </div>
      </div>
    </div>
  );
};

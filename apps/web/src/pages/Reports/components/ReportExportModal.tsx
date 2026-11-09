import React, { useState } from 'react';
import { FileText, FileSpreadsheet, Loader2, X, Download, ShieldCheck, ListOrdered, CheckCircle2 } from 'lucide-react';
import { reportsService } from '../../../services/reports';

interface ReportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  activeTabLabel: string;
  filters?: Record<string, any>;
}

export const ReportExportModal: React.FC<ReportExportModalProps> = ({
  isOpen,
  onClose,
  activeTab,
  activeTabLabel,
  filters = {},
}) => {
  const [selectedFormat, setSelectedFormat] = useState<'pdf-exec' | 'pdf-ana' | 'csv'>('pdf-exec');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleExport = async () => {
    setLoading(true);
    setErrorMessage('');
    setSuccess(false);

    try {
      const dateStr = new Date().toISOString().split('T')[0];
      const params: Record<string, any> = { ...filters };

      if (selectedFormat === 'pdf-exec') {
        params.format = 'pdf';
        params.mode = 'executive';
        await reportsService.exportReport(activeTab, params, `relatorio-executivo-${activeTab}-${dateStr}.pdf`);
      } else if (selectedFormat === 'pdf-ana') {
        params.format = 'pdf';
        params.mode = 'analytical';
        await reportsService.exportReport(activeTab, params, `relatorio-analitico-${activeTab}-${dateStr}.pdf`);
      } else if (selectedFormat === 'csv') {
        params.format = 'csv';
        await reportsService.exportReport(activeTab, params, `dados-${activeTab}-${dateStr}.csv`);
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Erro na exportação do relatório:', err);
      setErrorMessage(err.response?.data?.message || 'Falha ao processar a exportação do relatório. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header do Modal */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-[#0051A2] dark:text-blue-300 flex items-center justify-center shadow-xs">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Exportar Relatório Oficial
              </h2>
              <p className="text-2xs text-slate-500 dark:text-slate-400">
                Painel selecionado: <strong className="text-blue-700 dark:text-blue-300 font-semibold">{activeTabLabel}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Escolha o formato e a granularidade do documento a ser gerado pelo sistema:
          </p>

          {/* Opções de Formato */}
          <div className="space-y-2.5">
            {/* Opção 1: PDF Executivo */}
            <label
              className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                selectedFormat === 'pdf-exec'
                  ? 'border-[#0051A2] bg-blue-50/50 dark:bg-blue-950/30 dark:border-blue-700 shadow-xs ring-1 ring-[#0051A2]'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <input
                type="radio"
                name="exportFormat"
                value="pdf-exec"
                checked={selectedFormat === 'pdf-exec'}
                onChange={() => setSelectedFormat('pdf-exec')}
                className="mt-1 text-[#0051A2] focus:ring-[#0051A2]"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    PDF Oficial Executivo (Sintético)
                  </span>
                  <span className="text-3xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                    Recomendado
                  </span>
                </div>
                <p className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Resumo de KPIs, tabelas consolidadas, dados institucionais do SUS e notas de auditoria. Ideal para reuniões de gestão e secretarias.
                </p>
              </div>
            </label>

            {/* Opção 2: PDF Analítico */}
            <label
              className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                selectedFormat === 'pdf-ana'
                  ? 'border-[#0051A2] bg-blue-50/50 dark:bg-blue-950/30 dark:border-blue-700 shadow-xs ring-1 ring-[#0051A2]'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <input
                type="radio"
                name="exportFormat"
                value="pdf-ana"
                checked={selectedFormat === 'pdf-ana'}
                onChange={() => setSelectedFormat('pdf-ana')}
                className="mt-1 text-[#0051A2] focus:ring-[#0051A2]"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <ListOrdered className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    PDF Oficial Analítico (Completo)
                  </span>
                </div>
                <p className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Inclui o resumo executivo seguido da relação nominal exaustiva de pacientes e atendimentos para auditoria, fila e conferência diária.
                </p>
              </div>
            </label>

            {/* Opção 3: Planilha Estruturada (Excel / CSV) */}
            <label
              className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                selectedFormat === 'csv'
                  ? 'border-[#0051A2] bg-blue-50/50 dark:bg-blue-950/30 dark:border-blue-700 shadow-xs ring-1 ring-[#0051A2]'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <input
                type="radio"
                name="exportFormat"
                value="csv"
                checked={selectedFormat === 'csv'}
                onChange={() => setSelectedFormat('csv')}
                className="mt-1 text-[#0051A2] focus:ring-[#0051A2]"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    Planilha Estruturada (Excel / CSV)
                  </span>
                </div>
                <p className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Dados brutos em linhas e colunas formatados com acentuação em português e separador padrão para abertura direta no Microsoft Excel ou Power BI.
                </p>
              </div>
            </label>
          </div>

          {/* Selo de Garantia SUS / SINPeP */}
          <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 text-2xs text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Documentos gerados com Brasão Oficial, metadados de autenticidade e rastreabilidade pelo operador.</span>
          </div>

          {/* Mensagem de Erro */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
              {errorMessage}
            </div>
          )}
        </div>

        {/* Rodapé do Modal com Ações */}
        <div className="px-6 py-4 bg-slate-50/80 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleExport}
            disabled={loading || success}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0051A2] hover:bg-[#003B77] text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 disabled:opacity-70 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Gerando Documento...</span>
              </>
            ) : success ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>Download Concluído!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Iniciar Exportação</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

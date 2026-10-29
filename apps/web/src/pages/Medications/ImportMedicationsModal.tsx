import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  X, 
  Upload, 
  FileText, 
  Loader2, 
  CheckCircle2, 
  RefreshCw,
  HardDrive
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  importMedicationsCsv, 
  syncLocalMedicationsCsv, 
  type ImportCsvResponse 
} from '../../services/medications';
import { useAuthStore } from '../../store/useAuthStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportMedicationsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const token = useAuthStore(state => state.token);
  const queryClient = useQueryClient();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [importResult, setImportResult] = useState<ImportCsvResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'local'>('upload');

  const uploadMutation = useMutation({
    mutationFn: (file: File) =>
      importMedicationsCsv(file, token!, (progressEvent) => {
        if (progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      }),
    onSuccess: (data) => {
      setImportResult(data);
      queryClient.invalidateQueries({ queryKey: ['medications'] });
      queryClient.invalidateQueries({ queryKey: ['medication-stats'] });
      toast.success('Carga de medicamentos da ANVISA concluída com sucesso!');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Erro durante a importação do CSV.');
    },
    onSettled: () => {
      setUploadProgress(null);
    },
  });

  const syncLocalMutation = useMutation({
    mutationFn: () => syncLocalMedicationsCsv(token!),
    onSuccess: (data) => {
      setImportResult(data);
      queryClient.invalidateQueries({ queryKey: ['medications'] });
      queryClient.invalidateQueries({ queryKey: ['medication-stats'] });
      toast.success('Base de medicamentos sincronizada com sucesso a partir do arquivo local!');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Erro ao sincronizar com arquivo local do servidor.');
    },
  });

  if (!isOpen) return null;

  const isProcessing = uploadMutation.isPending || syncLocalMutation.isPending;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.toLowerCase().endsWith('.csv')) {
        toast.error('Selecione um arquivo no formato .csv');
        return;
      }
      setSelectedFile(file);
      setImportResult(null);
    }
  };

  const handleStartUpload = () => {
    if (!selectedFile) {
      toast.error('Selecione um arquivo CSV para continuar.');
      return;
    }
    uploadMutation.mutate(selectedFile);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setImportResult(null);
    setUploadProgress(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-lg shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-md">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Importação / Atualização de Medicamentos (ANVISA)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Atualize o catálogo oficial a partir de arquivos de dados abertos
              </p>
            </div>
          </div>
          {!isProcessing && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Tab selection */}
        <div className="flex border-b border-slate-200 dark:border-slate-700 px-4 pt-3 gap-4 text-sm font-medium">
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => { setActiveTab('upload'); handleReset(); }}
            className={`pb-2.5 transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
              activeTab === 'upload'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <Upload className="w-4 h-4" /> Enviar Novo Arquivo CSV
          </button>
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => { setActiveTab('local'); handleReset(); }}
            className={`pb-2.5 transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
              activeTab === 'local'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <HardDrive className="w-4 h-4" /> Sincronizar com Arquivo do Servidor
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {importResult ? (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-300 flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm">Carga concluída com sucesso!</h4>
                  <p className="text-xs mt-1 text-emerald-700 dark:text-emerald-400">
                    A base de dados de medicamentos foi atualizada e reindexada para pesquisa instantânea.
                  </p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-md border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] text-slate-500 font-medium">Total Processado</span>
                  <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                    {importResult.totalProcessed.toLocaleString('pt-BR')}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-md border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] text-slate-500 font-medium">Medicamentos Ativos</span>
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {importResult.totalActive.toLocaleString('pt-BR')}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-md border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] text-slate-500 font-medium">Com Dosagem</span>
                  <div className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-1">
                    {importResult.totalWithDosage.toLocaleString('pt-BR')}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-md border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] text-slate-500 font-medium">Laboratórios</span>
                  <div className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-1">
                    {importResult.laboratoriesCount.toLocaleString('pt-BR')}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-md border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] text-slate-500 font-medium">Princípios Ativos</span>
                  <div className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-1">
                    {importResult.substancesCount.toLocaleString('pt-BR')}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-md border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] text-slate-500 font-medium">Tempo de Execução</span>
                  <div className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-1">
                    {(importResult.durationMs / 1000).toFixed(1)}s
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'upload' ? (
            <div className="space-y-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                O arquivo deve ser o arquivo CSV oficial de dados abertos da ANVISA (codificado em Latin-1 / UTF-8 com separador ponto e vírgula <code>;</code>).
              </div>

              {/* Upload Drop Area */}
              <label className="border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-400 rounded-lg p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-900/40">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  disabled={isProcessing}
                  className="hidden"
                />
                <FileText className="w-10 h-10 text-slate-400" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {selectedFile ? selectedFile.name : 'Clique para selecionar o arquivo CSV'}
                </span>
                <span className="text-xs text-slate-400">
                  {selectedFile 
                    ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB selecionado`
                    : 'Formatos suportados: .csv (até 300MB)'}
                </span>
              </label>

              {uploadProgress !== null && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300">
                    <span>Enviando arquivo...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {uploadMutation.isPending && uploadProgress === 100 && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md text-blue-800 dark:text-blue-300 text-xs flex items-center gap-2 animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
                  Processando registros, normalizando substâncias e atualizando índices no banco de dados. Isso pode levar de 30 a 50 segundos...
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-md border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-white text-sm">
                  <HardDrive className="w-4 h-4 text-blue-500" />
                  Arquivo Local Pré-carregado
                </div>
                <p>
                  O servidor possui o arquivo <code>scratch/DADOS_ABERTOS_MEDICAMENTOS.csv</code> (~228.800 registros) pronto para sincronização direta em alta velocidade, sem necessidade de upload de rede pelo navegador.
                </p>
              </div>

              {syncLocalMutation.isPending && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md text-blue-800 dark:text-blue-300 text-xs flex items-center gap-3 animate-pulse">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600 shrink-0" />
                  <div>
                    <span className="font-bold">Sincronizando banco de dados...</span>
                    <p className="mt-0.5">Lendo arquivo local, validando duplicidades e indexando termos.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            {isProcessing && 'Por favor, não feche esta janela durante a carga.'}
          </div>

          <div className="flex items-center gap-2">
            {importResult ? (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md text-sm transition-colors cursor-pointer"
              >
                Concluir e Fechar
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isProcessing}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700 font-medium rounded-md text-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>

                {activeTab === 'upload' ? (
                  <button
                    type="button"
                    onClick={handleStartUpload}
                    disabled={!selectedFile || isProcessing}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-md text-sm transition-colors cursor-pointer shadow-sm disabled:cursor-not-allowed"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Iniciar Importação
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => syncLocalMutation.mutate()}
                    disabled={isProcessing}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-medium rounded-md text-sm transition-colors cursor-pointer shadow-sm disabled:cursor-not-allowed"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sincronizando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        Sincronizar Agora
                      </>
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

import { useState, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  esusImportService,
  type EsusConfigResponse,
  type EsusImportJob,
  type EsusPreviewResult,
  type ProcessBatchResult,
  type EsusDateFieldType,
} from '../services/esusImport';
import { toast } from 'sonner';

export interface ImportLogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warn' | 'error';
}

export interface ImportProgress {
  current: number;
  total: number;
  percent: number;
  stage: string;
  batchIndex: number;
  totalBatches: number;
}

export const useEsusConfig = () => {
  return useQuery<EsusConfigResponse>({
    queryKey: ['regulation', 'esus-import', 'config'],
    queryFn: () => esusImportService.getConfig(),
    staleTime: 1000 * 60 * 10, // 10 minutos
  });
};

export const useEsusImportJobs = () => {
  return useQuery<EsusImportJob[]>({
    queryKey: ['regulation', 'esus-import', 'jobs'],
    queryFn: () => esusImportService.getJobs(),
    refetchInterval: 10000,
  });
};

export const useRunEsusImport = () => {
  const queryClient = useQueryClient();
  const [isRunning, setIsRunning] = useState(false);
  const [currentJob, setCurrentJob] = useState<EsusImportJob | null>(null);
  const [progress, setProgress] = useState<ImportProgress>({
    current: 0,
    total: 0,
    percent: 0,
    stage: 'Aguardando início',
    batchIndex: 0,
    totalBatches: 0,
  });

  const [totals, setTotals] = useState<ProcessBatchResult>({
    processed: 0,
    patientsCreated: 0,
    patientsUpdated: 0,
    patientsDeceasedSkipped: 0,
    requestsCreated: 0,
    requestsUpdated: 0,
    requestsSkippedStatus: 0,
  });

  const [logs, setLogs] = useState<ImportLogEntry[]>([]);
  const isCancelledRef = useRef(false);

  const addLog = useCallback((message: string, type: 'info' | 'success' | 'warn' | 'error' = 'info') => {
    const timeStr = new Date().toLocaleTimeString('pt-BR');
    setLogs((prev) => [
      {
        id: Math.random().toString(36).slice(2),
        timestamp: timeStr,
        message,
        type,
      },
      ...prev.slice(0, 300), // Mantém até 300 logs recentes
    ]);
  }, []);

  const cancelImport = useCallback(() => {
    isCancelledRef.current = true;
    addLog('Cancelamento solicitado pelo usuário. Finalizando lote atual...', 'warn');
  }, [addLog]);

  const startImport = useCallback(
    async (params: {
      config: EsusConfigResponse;
      startDate: string;
      endDate: string;
      previewResult: EsusPreviewResult;
      batchSize?: number;
      dateField?: EsusDateFieldType;
    }) => {
      const {
        config,
        startDate,
        endDate,
        previewResult,
        batchSize = 2500,
        dateField = previewResult.dateFieldUsed || 'dtSolicitacao',
      } = params;

      setIsRunning(true);
      isCancelledRef.current = false;
      setLogs([]);

      const totalHits = previewResult.totalHits;
      const totalEstimatedBatches = Math.max(1, Math.ceil(totalHits / batchSize));

      addLog(`Iniciando importação de dados do e-SUS Regulação para o período ${startDate} a ${endDate}...`, 'info');
      addLog(`Total de registros localizados no OpenSearch: ${totalHits.toLocaleString('pt-BR')}`, 'info');

      // 1. Cria o Job na API SINPeP
      let job: EsusImportJob;
      try {
        job = await esusImportService.createJob({
          dateRangeStart: startDate,
          dateRangeEnd: endDate,
          totalRecordsFound: totalHits,
        });
        setCurrentJob(job);
        addLog(`Job de auditoria #${job.id.slice(0, 8)} criado com sucesso no banco SINPeP.`, 'success');
      } catch (err: any) {
        addLog(`Falha ao registrar job na API: ${err.message}`, 'error');
        setIsRunning(false);
        toast.error('Não foi possível iniciar o job no servidor.');
        return;
      }

      const accumulatedTotals: ProcessBatchResult = {
        processed: 0,
        patientsCreated: 0,
        patientsUpdated: 0,
        patientsDeceasedSkipped: 0,
        requestsCreated: 0,
        requestsUpdated: 0,
        requestsSkippedStatus: 0,
      };

      setTotals({ ...accumulatedTotals });
      setProgress({
        current: 0,
        total: totalHits,
        percent: 0,
        stage: 'Baixando dados do e-SUS...',
        batchIndex: 0,
        totalBatches: totalEstimatedBatches,
      });

      let searchAfter: any[] | undefined = undefined;
      let batchCount = 0;
      let hasMore = true;

      try {
        while (hasMore && !isCancelledRef.current) {
          batchCount++;

          addLog(`[Lote ${batchCount}/${totalEstimatedBatches}] Baixando até ${batchSize} registros do OpenSearch via navegador...`, 'info');

          // Busca lote no OpenSearch
          const batchData = await esusImportService.fetchBatch(
            config,
            startDate,
            endDate,
            dateField,
            batchSize,
            searchAfter,
          );

          const hits = batchData.hits || [];
          if (hits.length === 0) {
            addLog(`Fim dos registros retornados pelo e-SUS. Total de lotes consultados: ${batchCount}.`, 'info');
            hasMore = false;
            break;
          }

          addLog(`[Lote ${batchCount}] ${hits.length} registros obtidos. Enviando para persistência no SINPeP...`, 'info');

          // Envia o lote para a API SINPeP processar em transação (otimizando payload)
          const cleanHits = hits.map((h: any) => ({
            _id: h._id,
            _source: h._source || h,
          }));

          const batchResult = await esusImportService.processBatch({
            jobId: job.id,
            hits: cleanHits,
          });

          accumulatedTotals.processed += batchResult.processed;
          accumulatedTotals.patientsCreated += batchResult.patientsCreated;
          accumulatedTotals.patientsUpdated += batchResult.patientsUpdated;
          accumulatedTotals.patientsDeceasedSkipped += batchResult.patientsDeceasedSkipped;
          accumulatedTotals.requestsCreated += batchResult.requestsCreated;
          accumulatedTotals.requestsUpdated += batchResult.requestsUpdated;
          accumulatedTotals.requestsSkippedStatus += batchResult.requestsSkippedStatus;

          setTotals({ ...accumulatedTotals });

          const percent = Math.min(100, Math.round((accumulatedTotals.processed / Math.max(1, totalHits)) * 100));

          setProgress({
            current: accumulatedTotals.processed,
            total: totalHits,
            percent,
            stage: `Processando lote ${batchCount} de ${totalEstimatedBatches}`,
            batchIndex: batchCount,
            totalBatches: totalEstimatedBatches,
          });

          addLog(
            `[Lote ${batchCount} OK] +${batchResult.patientsCreated} novos pacientes, +${batchResult.requestsCreated} requisições pendentes gravadas.`,
            'success',
          );

          // Pega a chave sort do último item para continuar a paginação profunda
          const lastHit = hits[hits.length - 1];
          searchAfter = lastHit.sort;

          if (hits.length < batchSize) {
            hasMore = false;
          }
        }

        if (isCancelledRef.current) {
          addLog('Importação cancelada pelo usuário.', 'warn');
          await esusImportService.failJob(job.id, 'Importação interrompida pelo operador.');
          toast.warning('Importação cancelada.');
        } else {
          // Finaliza o job com sucesso
          addLog('Consolidando resultados finais e gravando auditoria...', 'info');
          const completedJob = await esusImportService.completeJob(job.id, {
            totalRecordsProcessed: accumulatedTotals.processed,
            patientsCreated: accumulatedTotals.patientsCreated,
            patientsUpdated: accumulatedTotals.patientsUpdated,
            patientsDeceasedSkipped: accumulatedTotals.patientsDeceasedSkipped,
            requestsCreated: accumulatedTotals.requestsCreated,
            requestsUpdated: accumulatedTotals.requestsUpdated,
            requestsSkippedStatus: accumulatedTotals.requestsSkippedStatus,
          });

          setCurrentJob(completedJob);
          addLog('Importação concluída com sucesso!', 'success');
          toast.success(
            `Importação finalizada! ${accumulatedTotals.patientsCreated} pacientes e ${accumulatedTotals.requestsCreated} solicitações regulatórias cadastradas.`,
          );
        }
      } catch (err: any) {
        addLog(`Erro fatal durante o processamento do lote: ${err.message}`, 'error');
        await esusImportService.failJob(job.id, err.message || 'Erro durante a importação.');
        toast.error(`Erro na importação: ${err.message}`);
      } finally {
        setIsRunning(false);
        queryClient.invalidateQueries({ queryKey: ['regulation', 'esus-import', 'jobs'] });
        queryClient.invalidateQueries({ queryKey: ['regulation', 'inbox'] });
        queryClient.invalidateQueries({ queryKey: ['regulation', 'waiting-list'] });
        queryClient.invalidateQueries({ queryKey: ['patients'] });
      }
    },
    [addLog, queryClient],
  );

  return {
    isRunning,
    currentJob,
    progress,
    totals,
    logs,
    startImport,
    cancelImport,
  };
};

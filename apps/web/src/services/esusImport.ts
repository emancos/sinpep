import api from './api';

export interface EsusConfigResponse {
  apiUrl: string;
  authorizationHeader: string;
  defaultStartDate: string;
  defaultEndDate: string;
  cityCode: string;
  cityName: string;
}

export interface EsusImportJob {
  id: string;
  startedAt: string;
  finishedAt?: string | null;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  dateRangeStart?: string;
  dateRangeEnd?: string;
  totalRecordsFound: number;
  totalRecordsProcessed: number;
  patientsCreated: number;
  patientsUpdated: number;
  patientsDeceasedSkipped: number;
  requestsCreated: number;
  requestsUpdated: number;
  requestsSkippedStatus: number;
  errorMessage?: string | null;
  createdByUserId?: string | null;
  createdByUser?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface EsusPreviewStatusBucket {
  key: string;
  doc_count: number;
}

export interface EsusPreviewResult {
  totalHits: number;
  livingCount: number;
  deceasedCount: number;
  statusBuckets: EsusPreviewStatusBucket[];
  eligibleRequestsCount: number;
}

export interface ProcessBatchResult {
  processed: number;
  patientsCreated: number;
  patientsUpdated: number;
  patientsDeceasedSkipped: number;
  requestsCreated: number;
  requestsUpdated: number;
  requestsSkippedStatus: number;
}

export const esusImportService = {
  /**
   * Obtém as configurações e credenciais para o e-SUS Regulação da nossa API
   */
  async getConfig(): Promise<EsusConfigResponse> {
    const res = await api.get<EsusConfigResponse>('/regulation/esus-import/config');
    return res.data;
  },

  /**
   * Lista o histórico de jobs de importação
   */
  async getJobs(): Promise<EsusImportJob[]> {
    const res = await api.get<EsusImportJob[]>('/regulation/esus-import/jobs');
    return res.data;
  },

  /**
   * Cria registro de novo job
   */
  async createJob(dto: {
    dateRangeStart: string;
    dateRangeEnd: string;
    totalRecordsFound: number;
  }): Promise<EsusImportJob> {
    const res = await api.post<EsusImportJob>('/regulation/esus-import/jobs', dto);
    return res.data;
  },

  /**
   * Envia um lote de hits obtidos pelo navegador para processamento atômico no backend
   */
  async processBatch(dto: {
    jobId: string;
    hits: Array<{ _id: string; _source: any }>;
  }): Promise<ProcessBatchResult> {
    const res = await api.post<ProcessBatchResult>('/regulation/esus-import/process-batch', dto);
    return res.data;
  },

  /**
   * Conclui o job
   */
  async completeJob(id: string, summary?: any): Promise<EsusImportJob> {
    const res = await api.post<EsusImportJob>(`/regulation/esus-import/jobs/${id}/complete`, summary || {});
    return res.data;
  },

  /**
   * Registra falha no job
   */
  async failJob(id: string, errorMessage: string): Promise<EsusImportJob> {
    const res = await api.post<EsusImportJob>(`/regulation/esus-import/jobs/${id}/fail`, { errorMessage });
    return res.data;
  },

  /**
   * Consulta diretamente o OpenSearch do e-SUS pelo Navegador (Client-Side)
   * para contornar restrições de IP de VPS
   */
  async queryOpenSearch(apiUrl: string, authHeader: string, body: any): Promise<any> {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Falha na comunicação com o e-SUS Regulação (${response.status}): ${errText.slice(0, 200)}`);
    }

    return response.json();
  },

  /**
   * Executa a prévia estatística diretamente do navegador
   */
  async fetchPreview(
    config: EsusConfigResponse,
    startDate: string,
    endDate: string,
  ): Promise<EsusPreviewResult> {
    const query = {
      size: 0,
      track_total_hits: true,
      query: {
        bool: {
          must: [
            {
              range: {
                dtMarcacao: {
                  gte: startDate,
                  lte: endDate,
                  format: 'yyyy-MM-dd',
                },
              },
            },
          ],
        },
      },
      aggs: {
        statuses: {
          terms: {
            field: 'noSolicitacaoStatus',
            size: 30,
          },
        },
        living: {
          terms: {
            field: 'pacienteVivo',
            size: 5,
          },
        },
      },
    };

    const res = await this.queryOpenSearch(config.apiUrl, config.authorizationHeader, query);
    const totalHits = typeof res.hits?.total?.value === 'number' ? res.hits.total.value : 0;
    const statusBuckets: EsusPreviewStatusBucket[] = res.aggregations?.statuses?.buckets || [];
    const livingBuckets: Array<{ key: any; doc_count: number }> = res.aggregations?.living?.buckets || [];

    let livingCount = 0;
    let deceasedCount = 0;
    for (const b of livingBuckets) {
      if (b.key === 1 || b.key === 'true' || b.key === true) {
        livingCount += b.doc_count;
      } else {
        deceasedCount += b.doc_count;
      }
    }

    // Calcula requisições elegíveis nos 4 status regulatórios alvo
    const eligibleKeywords = [
      'lista de espera',
      'pendente de agendamento',
      'aguardando autorização',
      'pendente na regulação',
      'devolvida',
      'devolvido',
      'agendamento cancelado',
    ];

    let eligibleRequestsCount = 0;
    for (const b of statusBuckets) {
      const k = (b.key || '').toLowerCase();
      if (eligibleKeywords.some((w) => k.includes(w))) {
        eligibleRequestsCount += b.doc_count;
      }
    }

    return {
      totalHits,
      livingCount: livingCount || totalHits - deceasedCount,
      deceasedCount,
      statusBuckets,
      eligibleRequestsCount,
    };
  },

  /**
   * Busca um lote de registros via search_after
   */
  async fetchBatch(
    config: EsusConfigResponse,
    startDate: string,
    endDate: string,
    size: number = 2500,
    searchAfter?: any[],
  ): Promise<{ hits: any[]; total: number }> {
    const body: any = {
      size,
      track_total_hits: true,
      sort: [
        { dtMarcacao: { order: 'asc' } },
        { coSolicitacao: { order: 'asc' } },
      ],
      query: {
        bool: {
          must: [
            {
              range: {
                dtMarcacao: {
                  gte: startDate,
                  lte: endDate,
                  format: 'yyyy-MM-dd',
                },
              },
            },
          ],
        },
      },
    };

    if (searchAfter && searchAfter.length > 0) {
      body.search_after = searchAfter;
    }

    const res = await this.queryOpenSearch(config.apiUrl, config.authorizationHeader, body);
    return {
      hits: res.hits?.hits || [],
      total: res.hits?.total?.value || 0,
    };
  },
};

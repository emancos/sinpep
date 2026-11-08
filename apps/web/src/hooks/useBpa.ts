import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import { toast } from 'sonner';

const apiUrl = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000';

export interface BpaRecord {
  id?: string;
  cnes: string;
  competencia: string;
  cnsProfissional: string;
  cboProfissional: string;
  nomeProfissional?: string;
  nomeEstabelecimento?: string;
  dataAtendimento: string; // AAAAMMDD
  procedimento: string;
  procedimentoNome?: string;
  cpfPaciente: string;
  cnsPaciente: string;
  sexo: string;
  ibge: string;
  cid: string;
  idade: string;
  quantidade: string;
  caraterAtendimento: string;
  numeroAutorizacao: string;
  origem: string;
  nomePaciente: string;
  dataNascimento: string;
  racaCor: string;
  etnia: string;
  nacionalidade: string;
  cep: string;
  logradouro: string;
  endereco: string;
  complemento: string;
  numero: string;
  bairro: string;
  telefone: string;
  email: string;
  ine: string;
  situacaoRua?: boolean;
  semCpf?: boolean;
}

export interface BpaRecordsResponse {
  records: BpaRecord[];
  total: number;
  summary: {
    withCpf: number;
    withCns: number;
    withoutCid: number;
    withoutProc: number;
  };
}

export interface BpaBatch {
  id: string;
  competencia: string;
  healthCenterId: string;
  totalRecords: number;
  sha256Hash: string;
  fileContent: string;
  metadata?: any;
  createdById: string;
  createdAt: string;
  healthCenter?: {
    id: string;
    name: string;
    cnes: string;
  };
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
}

export function useBpaRecords(params: {
  competencia: string;
  unitId?: string;
  doctorId?: string;
  patientIdType?: 'CPF' | 'CNS';
}) {
  const token = useAuthStore((s) => s.token);

  return useQuery<BpaRecordsResponse>({
    queryKey: ['bpa-records', params],
    queryFn: async () => {
      const res = await axios.get(`${apiUrl}/bpa/records`, {
        params,
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    },
    enabled: Boolean(token && params.competencia),
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
}

export function useBpaBatches(params?: { competencia?: string; unitId?: string }) {
  const token = useAuthStore((s) => s.token);

  return useQuery<BpaBatch[]>({
    queryKey: ['bpa-batches', params],
    queryFn: async () => {
      const res = await axios.get(`${apiUrl}/bpa/batches`, {
        params,
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    },
    enabled: Boolean(token),
  });
}

export function useBpaActions() {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);

  // 1. Exportar TXT
  const exportTxtMutation = useMutation({
    mutationFn: async (payload: { competencia: string; unitId: string; records: BpaRecord[] }) => {
      const res = await axios.post(`${apiUrl}/bpa/export-txt`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    },
    onSuccess: (data) => {
      const blob = new Blob([data.fileContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename || 'BPA_MAG_OFICIAL.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Arquivo magnético do BPA (.TXT) gerado com sucesso!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Falha ao exportar arquivo TXT do BPA.');
    },
  });

  // 2. Exportar PDF Oficial
  const exportPdfMutation = useMutation({
    mutationFn: async (payload: { records: BpaRecord[]; competencia: string; unit: string }) => {
      const res = await axios.post(`${apiUrl}/bpa/export-pdf`, payload, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });
      return res;
    },
    onSuccess: (res, variables) => {
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Formulario_BPA_I_${variables.competencia.replace(/[^0-9]/g, '')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Formulário oficial BPA-I (.PDF) gerado com sucesso!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Falha ao gerar o PDF oficial do BPA.');
    },
  });

  // 3. Salvar e Congelar Lote Oficial
  const createBatchMutation = useMutation({
    mutationFn: async (payload: {
      competencia: string;
      unitId: string;
      totalRecords: number;
      fileContent: string;
      metadata?: any;
    }) => {
      const res = await axios.post(`${apiUrl}/bpa/batches`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bpa-batches'] });
      toast.success('Lote Oficial arquivado com sucesso com assinatura SHA-256!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Falha ao arquivar lote oficial.');
    },
  });

  // 4. Download de Lote Arquivado
  const downloadBatch = async (batch: BpaBatch) => {
    try {
      const res = await axios.get(`${apiUrl}/bpa/batches/${batch.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BPA_${batch.competencia}_${batch.healthCenter?.cnes || 'OFICIAL'}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Download do lote oficial concluído.');
    } catch {
      toast.error('Erro ao baixar o arquivo do lote arquivado.');
    }
  };

  // 5. Excluir Lote Arquivado
  const deleteBatchMutation = useMutation({
    mutationFn: async (batchId: string) => {
      const res = await axios.delete(`${apiUrl}/bpa/batches/${batchId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bpa-batches'] });
      toast.success('Lote oficial removido com sucesso.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Erro ao excluir lote oficial.');
    },
  });

  return {
    exportTxt: exportTxtMutation.mutateAsync,
    isExportingTxt: exportTxtMutation.isPending,
    exportPdf: exportPdfMutation.mutateAsync,
    isExportingPdf: exportPdfMutation.isPending,
    createBatch: createBatchMutation.mutateAsync,
    isCreatingBatch: createBatchMutation.isPending,
    downloadBatch,
    deleteBatch: deleteBatchMutation.mutateAsync,
    isDeletingBatch: deleteBatchMutation.isPending,
  };
}

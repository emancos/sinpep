import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { X, Save, Building2, Phone, UserPlus, Star, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { createPatientFromEsus } from '../../services/reception';
import { useAuthStore } from '../../store/useAuthStore';
import axios from 'axios';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const formatBirthDate = (dateStr?: string) => {
  if (!dateStr) return '-';
  const cleanDate = dateStr.trim().split('T')[0].split(' ')[0];
  const parts = cleanDate.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

interface CreatePatientModalProps {
  data: {
    patient: any;
    specialty: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export const CreatePatientModal: React.FC<CreatePatientModalProps> = ({ data, onClose, onSuccess }) => {
  const token = useAuthStore(state => state.token);
  const p = data.patient;
  
  const [healthCenterId, setHealthCenterId] = useState('');
  const [healthAgentId, setHealthAgentId] = useState('');
  const [priority, setPriority] = useState<'PRIORITARIO' | 'CONVENCIONAL' | ''>('');
  const [phones, setPhones] = useState([{ number: p.pacienteTelefones?.[0]?.nuTelefone || '', isWhatsapp: true }]);

  const { data: healthCenters } = useQuery({
    queryKey: ['health-centers'],
    queryFn: async () => {
      const res = await axios.get(`${apiUrl}/health-centers`, { headers: { Authorization: `Bearer ${token}` }});
      return res.data;
    }
  });

  const { data: healthAgents } = useQuery({
    queryKey: ['health-agents', healthCenterId],
    queryFn: async () => {
      const res = await axios.get(`${apiUrl}/health-agents?limit=100&healthCenterId=${healthCenterId}`, { headers: { Authorization: `Bearer ${token}` }});
      return res.data;
    },
    enabled: !!healthCenterId
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!healthCenterId) throw new Error('Unidade de Saúde é obrigatória');
      if (!healthAgentId) throw new Error('Agente Comunitário de Saúde é obrigatório');
      if (!priority) throw new Error('Classificação de atendimento (Prioritário ou Convencional) é obrigatória');
      await createPatientFromEsus({
        esusData: p,
        healthCenterId,
        healthAgentId,
        phones,
        priority,
      }, token!);
    },
    onSuccess: () => {
      toast.success('Prontuário criado e paciente adicionado à fila!');
      onSuccess();
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao criar prontuário.');
    }
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Confirmar Cadastro</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-100 dark:border-slate-700/50">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Dados do e-SUS (Importação Automática)</h3>
            <div className="grid grid-cols-2 gap-4 text-sm text-slate-600 dark:text-slate-400">
              <div><strong className="text-slate-800 dark:text-slate-300">Nome:</strong> {p.pacienteNome}</div>
              <div><strong className="text-slate-800 dark:text-slate-300">CPF:</strong> {p.pacienteNuCpf}</div>
              <div><strong className="text-slate-800 dark:text-slate-300">Nascimento:</strong> {formatBirthDate(p.pacienteDtNascimento)}</div>
              <div><strong className="text-slate-800 dark:text-slate-300">Mãe:</strong> {p.pacienteNoMae}</div>
              {p.noEstabelecimentoExecutante && (
                <div className="col-span-2 pt-2 border-t border-slate-200 dark:border-slate-700/60">
                  <strong className="text-slate-800 dark:text-slate-300">Unidade Executante (Agendamento):</strong>{' '}
                  <span className="font-semibold text-blue-600 dark:text-blue-400">{p.noEstabelecimentoExecutante}</span>
                  {p.coCnesEstabelecimentoExecutante && (
                    <span className="text-xs font-mono text-slate-500 ml-1">(CNES: {p.coCnesEstabelecimentoExecutante})</span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-2">
                <Building2 className="w-4 h-4"/> Unidade de Saúde (Vínculo) *
              </label>
              <select 
                value={healthCenterId}
                onChange={(e) => {
                  setHealthCenterId(e.target.value);
                  setHealthAgentId(''); // Reset on change
                }}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Selecione a Unidade de Saúde</option>
                {healthCenters?.data?.map((hc: any) => (
                  <option key={hc.id} value={hc.id}>{hc.name}</option>
                ))}
              </select>
            </div>

            {healthCenterId && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-2">
                  <UserPlus className="w-4 h-4"/> Agente Comunitário de Saúde *
                </label>
                <select 
                  value={healthAgentId}
                  onChange={(e) => setHealthAgentId(e.target.value)}
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Selecione o ACS</option>
                  {healthAgents?.data?.map((agent: any) => (
                    <option key={agent.id} value={agent.id}>{agent.name} {agent.microArea ? `(Microárea: ${agent.microArea})` : ''}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Classificação de Atendimento na Fila */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5">
                <Star className="w-4 h-4 text-amber-500" />
                Classificação de Atendimento na Fila <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPriority('PRIORITARIO')}
                  className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                    priority === 'PRIORITARIO'
                      ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                  }`}
                >
                  <div
                    className={`w-4 h-4 mt-0.5 rounded-full border flex items-center justify-center shrink-0 ${
                      priority === 'PRIORITARIO' ? 'border-amber-600 bg-amber-600' : 'border-slate-300'
                    }`}
                  >
                    {priority === 'PRIORITARIO' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div>
                    <p className="font-semibold text-sm flex items-center gap-1">
                      ⭐ Paciente Prioritário
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Lei 10.048: Idoso (60+), Gestante, PCD, Autista, etc.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPriority('CONVENCIONAL')}
                  className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                    priority === 'CONVENCIONAL'
                      ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                  }`}
                >
                  <div
                    className={`w-4 h-4 mt-0.5 rounded-full border flex items-center justify-center shrink-0 ${
                      priority === 'CONVENCIONAL' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                    }`}
                  >
                    {priority === 'CONVENCIONAL' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div>
                    <p className="font-semibold text-sm flex items-center gap-1">
                      👤 Paciente Convencional
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Atendimento regular por ordem de agendamento/chegada.
                    </p>
                  </div>
                </button>
              </div>
              {!priority && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5 font-medium flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Seleção obrigatória entre Prioritário e Convencional.
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-2">
                <Phone className="w-4 h-4"/> Telefones de Contato
              </label>
              {phones.map((phone, idx) => (
                <div key={idx} className="flex items-center gap-3 mb-2">
                  <input 
                    type="text" 
                    value={phone.number}
                    onChange={(e) => {
                      const newPhones = [...phones];
                      newPhones[idx].number = e.target.value;
                      setPhones(newPhones);
                    }}
                    placeholder="(99) 99999-9999"
                    className="flex-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <input 
                      type="checkbox" 
                      checked={phone.isWhatsapp}
                      onChange={(e) => {
                        const newPhones = [...phones];
                        newPhones[idx].isWhatsapp = e.target.checked;
                        setPhones(newPhones);
                      }}
                      className="rounded border-slate-300 text-green-500 focus:ring-green-500"
                    />
                    WhatsApp
                  </label>
                </div>
              ))}
              <button 
                onClick={() => setPhones([...phones, { number: '', isWhatsapp: false }])}
                className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline"
              >
                + Adicionar outro telefone
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !healthCenterId || !healthAgentId || !priority}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {createMutation.isPending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <Save className="w-4 h-4"/>}
            Salvar e Colocar na Fila
          </button>
        </div>
      </div>
    </div>
  );
};

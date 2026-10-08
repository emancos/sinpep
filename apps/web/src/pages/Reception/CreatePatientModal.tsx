import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { X, Save, Building2, Phone, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { createPatientFromEsus } from '../../services/reception';
import { useAuthStore } from '../../store/useAuthStore';
import axios from 'axios';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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
      await createPatientFromEsus({
        esusData: p,
        healthCenterId,
        healthAgentId,
        phones
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
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Confirmação de Cadastro</h2>
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
              <div><strong className="text-slate-800 dark:text-slate-300">Nascimento:</strong> {p.pacienteDtNascimento}</div>
              <div><strong className="text-slate-800 dark:text-slate-300">Mãe:</strong> {p.pacienteNoMae}</div>
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
                  <UserPlus className="w-4 h-4"/> Agente Comunitário de Saúde (Opcional)
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
            disabled={createMutation.isPending || !healthCenterId}
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

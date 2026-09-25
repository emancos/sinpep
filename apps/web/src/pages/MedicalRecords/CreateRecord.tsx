import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCreateMedicalRecord } from '../../hooks/useMedicalRecords';
import { X, Loader2, Upload, Plus, Trash2, ArrowLeft, Activity } from 'lucide-react';
import { toast } from 'sonner';

export const CreateRecord: React.FC = () => {
  const { id: patientId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const createMutation = useCreateMedicalRecord();
  
  const [observation, setObservation] = useState('');
  const [cid10, setCid10] = useState('');
  const [returnValue, setReturnValue] = useState('');
  const [returnUnit, setReturnUnit] = useState('DIAS');
  
  const [medications, setMedications] = useState<{name: string, dosage: string}[]>([]);
  const [requestedExams, setRequestedExams] = useState<string[]>([]);
  const [medicationsJustification, setMedicationsJustification] = useState('');
  const [examsJustification, setExamsJustification] = useState('');
  const [files, setFiles] = useState<File[]>([]);

  const addMed = () => setMedications([...medications, { name: '', dosage: '' }]);
  const removeMed = (index: number) => setMedications(medications.filter((_, i) => i !== index));
  const updateMed = (index: number, field: string, val: string) => {
    const newMeds = [...medications];
    newMeds[index] = { ...newMeds[index], [field]: val };
    setMedications(newMeds);
  };

  const addExam = () => setRequestedExams([...requestedExams, '']);
  const removeExam = (index: number) => setRequestedExams(requestedExams.filter((_, i) => i !== index));
  const updateExam = (index: number, val: string) => {
    const newExams = [...requestedExams];
    newExams[index] = val;
    setRequestedExams(newExams);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles([...files, ...Array.from(e.target.files)]);
    }
  };

  const removeFile = (index: number) => setFiles(files.filter((_, i) => i !== index));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!observation.trim()) {
      toast.error('O prontuário precisa de uma observação clínica.');
      return;
    }

    if (!patientId) return;

    const validMeds = medications.filter(m => m.name.trim() !== '');
    if (validMeds.length > 0 && !medicationsJustification.trim()) {
      toast.error('A justificativa da prescrição médica é obrigatória.');
      return;
    }

    const validExams = requestedExams.filter(e => e.trim() !== '');
    if (validExams.length > 0 && !examsJustification.trim()) {
      toast.error('A justificativa do exame/procedimento é obrigatória.');
      return;
    }

    const formData = new FormData();
    formData.append('observation', observation);
    if (cid10) formData.append('cid10', cid10);
    if (returnValue) {
      formData.append('returnRequestedValue', returnValue);
      formData.append('returnRequestedUnit', returnUnit);
    }
    
    // Filter empty meds
    formData.append('medications', JSON.stringify(validMeds));
    if (validMeds.length > 0) formData.append('medicationsJustification', medicationsJustification);

    formData.append('requestedExams', JSON.stringify(validExams));
    if (validExams.length > 0) formData.append('examsJustification', examsJustification);

    files.forEach(f => formData.append('attachments', f));

    createMutation.mutate({ patientId, formData }, {
      onSuccess: () => {
        toast.success('Prontuário salvo com sucesso!');
        navigate(`/medical-records/${patientId}`);
      },
      onError: () => toast.error('Erro ao salvar o prontuário.')
    });
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
      <button 
        onClick={() => navigate(`/medical-records/${patientId}`)}
        className="flex items-center gap-2 text-slate-500 hover:text-blue-600 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar para o Histórico
      </button>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Novo Atendimento</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Preencha os detalhes da consulta ou procedimento.</p>
          </div>
        </div>

        <div className="p-6">
          <form id="record-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Observation */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                História Clínica / Prescrição <span className="text-red-500">*</span>
              </label>
              <textarea
                value={observation}
                onChange={e => setObservation(e.target.value)}
                rows={8}
                className="w-full p-3 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                placeholder="Descreva a anamnese, exame físico e conduta adotada..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* CID10 */}
              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  CID-10 Principal
                </label>
                <input
                  type="text"
                  value={cid10}
                  onChange={e => setCid10(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  placeholder="Ex: J01.9"
                />
              </div>

              {/* Retorno */}
              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Retorno Solicitado
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={returnValue}
                    onChange={e => setReturnValue(e.target.value)}
                    className="w-1/2 px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    placeholder="Valor"
                  />
                  <select
                    value={returnUnit}
                    onChange={e => setReturnUnit(e.target.value)}
                    className="w-1/2 px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="DIAS">Dias</option>
                    <option value="MESES">Meses</option>
                    <option value="ANOS">Anos</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Medications */}
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Medicações (Opcional)
                </label>
                <button type="button" onClick={addMed} className="text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 shadow-sm">
                  <Plus className="w-4 h-4" /> Adicionar Remédio
                </button>
              </div>
              
              {medications.length === 0 && (
                <div className="text-sm text-slate-500 italic text-center py-4">
                  Nenhuma medicação adicionada.
                </div>
              )}

              <div className="space-y-3">
                {medications.map((med, idx) => (
                  <div key={idx} className="flex gap-3">
                    <input
                      type="text"
                      value={med.name}
                      onChange={e => updateMed(idx, 'name', e.target.value)}
                      placeholder="Nome (Ex: Amoxicilina 500mg)"
                      className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                    <input
                      type="text"
                      value={med.dosage}
                      onChange={e => updateMed(idx, 'dosage', e.target.value)}
                      placeholder="Posologia (Ex: 1 comp 8/8h por 7 dias)"
                      className="flex-[1.5] px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                    <button type="button" onClick={() => removeMed(idx)} className="p-2 text-red-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {medications.length > 0 && (
                <div className="mt-4 border-t border-slate-200 dark:border-slate-700 pt-4">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Justificativa da Prescrição <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={medicationsJustification}
                    onChange={e => setMedicationsJustification(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="Justifique o uso das medicações prescritas..."
                  />
                </div>
              )}

            {/* Requested Exams */}
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Exames e Procedimentos Solicitados (Opcional)
                </label>
                <button type="button" onClick={addExam} className="text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 shadow-sm">
                  <Plus className="w-4 h-4" /> Adicionar Exame
                </button>
              </div>
              
              {requestedExams.length === 0 && (
                <div className="text-sm text-slate-500 italic text-center py-4">
                  Nenhum exame solicitado.
                </div>
              )}

              <div className="space-y-3">
                {requestedExams.map((exam, idx) => (
                  <div key={idx} className="flex gap-3">
                    <input
                      type="text"
                      value={exam}
                      onChange={e => updateExam(idx, e.target.value)}
                      placeholder="Nome do Exame/Procedimento"
                      className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                    <button type="button" onClick={() => removeExam(idx)} className="p-2 text-red-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {requestedExams.length > 0 && (
                <div className="mt-4 border-t border-slate-200 dark:border-slate-700 pt-4">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Justificativa do Procedimento/Exame <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={examsJustification}
                    onChange={e => setExamsJustification(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="Justifique a solicitação dos exames/procedimentos..."
                  />
                </div>
              )}

            {/* Uploads */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Anexos do Prontuário
              </label>
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors">
                <Upload className="w-10 h-10 text-slate-400 mb-3" />
                <p className="text-sm text-slate-600 dark:text-slate-400 text-center mb-4 font-medium">
                  Arraste arquivos ou clique para fazer upload
                </p>
                <p className="text-xs text-slate-500 text-center mb-4">
                  Suportado: PDF, JPG, PNG
                </p>
                <label className="cursor-pointer bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 px-5 py-2.5 rounded-lg font-medium hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors">
                  Selecionar Arquivos
                  <input type="file" multiple accept=".pdf,image/png,image/jpeg,image/jpg" className="hidden" onChange={handleFileChange} />
                </label>
              </div>

              {files.length > 0 && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate mr-3">{f.name}</span>
                      <button type="button" onClick={() => removeFile(i)} className="text-slate-400 hover:text-red-500 p-1 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </form>
        </div>

        <div className="px-6 py-5 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex justify-end gap-3">
          <button 
            type="button" 
            onClick={() => navigate(`/medical-records/${patientId}`)} 
            className="px-5 py-2.5 rounded-xl font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            form="record-form"
            disabled={createMutation.isPending}
            className="px-6 py-2.5 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 shadow-sm"
          >
            {createMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar Atendimento'}
          </button>
        </div>
      </div>
    </div>
  );
};

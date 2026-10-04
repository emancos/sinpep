import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCreateMedicalRecord } from '../../hooks/useMedicalRecords';
import { usePatient } from '../../hooks/usePatients';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAuthStore } from '../../store/useAuthStore';
import { X, Loader2, Upload, Plus, Trash2, ArrowLeft, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { Cid10Select } from './Cid10Select';
import imageCompression from 'browser-image-compression';

export const CreateRecord: React.FC = () => {
  const { id: patientId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const createMutation = useCreateMedicalRecord();
  const { token } = useAuthStore();
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const { data: patient } = usePatient(patientId!);
  
  const [observation, setObservation] = useState('');
  const [cid10, setCid10] = useState('');
  const [cid10Secondary, setCid10Secondary] = useState('');
  const [cid10AssociatedCauses, setCid10AssociatedCauses] = useState('');
  const [procSearchTerm, setProcSearchTerm] = useState('');
  const [isProcDropdownOpen, setIsProcDropdownOpen] = useState(false);

  const { data: procResults, isLoading: isSearchingProc } = useQuery({
    queryKey: ['proc-search', procSearchTerm],
    queryFn: async () => {
      const res = await axios.get(`${apiUrl}/procedures?search=${procSearchTerm}&limit=20`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data.data;
    },
    enabled: isProcDropdownOpen,
  });

  const [hasReturn, setHasReturn] = useState(false);
  const [returnValue, setReturnValue] = useState('');
  const [returnUnit, setReturnUnit] = useState('DIAS');
  
  const [medications, setMedications] = useState<{name: string, dosage: string}[]>([]);
  const [requestedExams, setRequestedExams] = useState<string[]>([]);
  const [medicationsJustification, setMedicationsJustification] = useState('');
  const [examsJustification, setExamsJustification] = useState('');
  const [files, setFiles] = useState<File[]>([]);

  const [clinicalDataReviewed, setClinicalDataReviewed] = useState(false);
  const [anamnesis, setAnamnesis] = useState({
    isHypertensive: false,
    isDiabetic: false,
    otherDiseases: '',
    isOncological: false,
    oncologicalStage: '',
    allergies: '',
    isPcd: false,
    pcdDescription: '',
    continuousMedications: [] as string[],
  });
  const [isOci, setIsOci] = useState(false);

  React.useEffect(() => {
    if (patient?.patientAnamnesis) {
      setAnamnesis({
        isHypertensive: patient.patientAnamnesis.isHypertensive || false,
        isDiabetic: patient.patientAnamnesis.isDiabetic || false,
        otherDiseases: patient.patientAnamnesis.otherDiseases || '',
        isOncological: patient.patientAnamnesis.isOncological || false,
        oncologicalStage: patient.patientAnamnesis.oncologicalStage || '',
        allergies: patient.patientAnamnesis.allergies || '',
        isPcd: patient.patientAnamnesis.isPcd || false,
        pcdDescription: patient.patientAnamnesis.pcdDescription || '',
        continuousMedications: patient.patientAnamnesis.continuousMedications || [],
      });
    }
  }, [patient]);

  const addMed = () => setMedications([...medications, { name: '', dosage: '' }]);
  const removeMed = (index: number) => setMedications(medications.filter((_, i) => i !== index));
  const updateMed = (index: number, field: string, val: string) => {
    const newMeds = [...medications];
    newMeds[index] = { ...newMeds[index], [field]: val };
    setMedications(newMeds);
  };

  const addExam = (examName: string) => {
    if (!requestedExams.includes(examName)) {
      setRequestedExams([...requestedExams, examName]);
    }
  };
  const removeExam = (index: number) => setRequestedExams(requestedExams.filter((_, i) => i !== index));

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const processedFiles: File[] = [];

      for (const file of selectedFiles) {
        if (file.type.startsWith('image/')) {
          try {
            const options = {
              maxSizeMB: 1,
              maxWidthOrHeight: 1920,
              useWebWorker: true,
              initialQuality: 0.8
            };
            const compressedBlob = await imageCompression(file, options);
            const compressedFile = new File([compressedBlob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            processedFiles.push(compressedFile);
          } catch (error) {
            console.error('Error compressing image:', error);
            processedFiles.push(file); // fallback
          }
        } else {
          processedFiles.push(file);
        }
      }

      setFiles(prev => [...prev, ...processedFiles]);
    }
  };

  const removeFile = (index: number) => setFiles(files.filter((_, i) => i !== index));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!clinicalDataReviewed) {
      toast.error('A revisão e confirmação dos dados clínicos do paciente é obrigatória.');
      return;
    }

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

    if (hasReturn && !returnValue) {
      toast.error('O tempo de retorno é obrigatório quando solicitado.');
      return;
    }

    const formData = new FormData();
    formData.append('observation', observation);
    if (cid10) formData.append('cid10', cid10);
    if (cid10Secondary) formData.append('cid10Secondary', cid10Secondary);
    if (cid10AssociatedCauses) formData.append('cid10AssociatedCauses', cid10AssociatedCauses);
    if (hasReturn && returnValue) {
      formData.append('returnRequestedValue', returnValue);
      formData.append('returnRequestedUnit', returnUnit);
    }
    
    // Filter empty meds
    formData.append('medications', JSON.stringify(validMeds));
    if (validMeds.length > 0) formData.append('medicationsJustification', medicationsJustification);

    formData.append('requestedExams', JSON.stringify(validExams));
    if (validExams.length > 0) formData.append('examsJustification', examsJustification);

    files.forEach(f => formData.append('attachments', f));

    formData.append('clinicalDataReviewed', 'true');
    formData.append('isOci', isOci.toString());
    formData.append('anamnesis', JSON.stringify({
      ...anamnesis,
      continuousMedications: anamnesis.continuousMedications.filter(m => m.trim() !== '')
    }));

    createMutation.mutate({ patientId, formData }, {
      onSuccess: () => {
        toast.success('Prontuário salvo com sucesso!');
        navigate(`/medical-records/${patientId}`);
      },
      onError: () => toast.error('Erro ao salvar o prontuário.')
    });
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between mb-4">
        <button 
          onClick={() => navigate(`/medical-records/${patientId}`)}
          className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para o Histórico
        </button>
      </div>

      <form id="record-form" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Column */}
          <div className="space-y-6 lg:col-span-2">
            <div className="bg-white dark:bg-slate-800 rounded-md shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3 bg-slate-50/50 dark:bg-slate-800/50">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white">Novo Atendimento</h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Preencha os detalhes da consulta ou procedimento.</p>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* OCI flag */}
                <div className="flex items-center gap-3 p-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-md">
                  <input type="checkbox" id="oci" checked={isOci} onChange={e => setIsOci(e.target.checked)} className="w-5 h-5 rounded-md text-orange-600 border-orange-300 focus:ring-orange-500" />
                  <label htmlFor="oci" className="text-sm font-bold text-orange-800 dark:text-orange-300 cursor-pointer">
                    Este atendimento se refere a uma Oferta de Cuidados Integrados (OCI)?
                  </label>
                </div>
                
                {/* Observation */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    História Clínica / Prescrição <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={observation}
                    onChange={e => setObservation(e.target.value)}
                    rows={8}
                    className="w-full p-3 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="Descreva a anamnese, exame físico e conduta adotada..."
                  />
                </div>

                {/* CIDs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Cid10Select label="CID-10 Principal" value={cid10} onChange={setCid10} />
                  <Cid10Select label="CID-10 Secundário (Opcional)" value={cid10Secondary} onChange={setCid10Secondary} />
                  <Cid10Select label="CID-10 Causas Associadas (Opcional)" value={cid10AssociatedCauses} onChange={setCid10AssociatedCauses} />
                </div>

                {/* Medications */}
                <div className="bg-slate-100 dark:bg-slate-900/60 p-4 rounded-md border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Medicações (Opcional)
                    </label>
                    <button type="button" onClick={addMed} className="text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-md text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 shadow-sm">
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
                          className="flex-1 px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                        <input
                          type="text"
                          value={med.dosage}
                          onChange={e => updateMed(idx, 'dosage', e.target.value)}
                          placeholder="Posologia (Ex: 1 comp 8/8h por 7 dias)"
                          className="flex-[1.5] px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                        <button type="button" onClick={() => removeMed(idx)} className="p-2 text-red-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
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
                        className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        placeholder="Justifique o uso das medicações prescritas..."
                      />
                    </div>
                  )}
                </div>

                {/* Requested Exams */}
                <div className="bg-slate-100 dark:bg-slate-900/60 p-4 rounded-md border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Exames e Procedimentos Solicitados (Opcional)
                    </label>
                  </div>
                  
                  <div className="relative mb-4">
                    <input
                      type="text"
                      value={procSearchTerm}
                      onChange={e => {
                        setProcSearchTerm(e.target.value);
                        if (!isProcDropdownOpen) setIsProcDropdownOpen(true);
                      }}
                      onFocus={() => setIsProcDropdownOpen(true)}
                      className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      placeholder="Buscar Procedimento ou Exame..."
                    />
                    {isProcDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsProcDropdownOpen(false)} />
                        <div className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {isSearchingProc ? (
                            <div className="p-3 text-sm text-slate-500 text-center">Buscando...</div>
                          ) : procResults?.length > 0 ? (
                            procResults.map((item: any) => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                  addExam(`${item.code} - ${item.name}`);
                                  setProcSearchTerm('');
                                  setIsProcDropdownOpen(false);
                                }}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                              >
                                <strong>{item.code}</strong> - {item.name}
                              </button>
                            ))
                          ) : (
                            <div className="p-3 text-sm text-slate-500 text-center">Nenhum resultado encontrado.</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {requestedExams.length === 0 && (
                    <div className="text-sm text-slate-500 italic text-center py-4 border border-dashed border-slate-300 dark:border-slate-700 rounded-md">
                      Nenhum exame solicitado.
                    </div>
                  )}

                  <div className="space-y-2">
                    {requestedExams.map((exam, idx) => (
                      <div key={idx} className="flex gap-3 items-center bg-white dark:bg-slate-800 p-2 rounded-md border border-slate-200 dark:border-slate-700">
                        <span className="flex-1 px-2 text-sm text-slate-900 dark:text-white font-medium">{exam}</span>
                        <button type="button" onClick={() => removeExam(idx)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
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
                        className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        placeholder="Justifique a solicitação dos exames/procedimentos..."
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Actions for Mobile */}
            <div className="bg-white dark:bg-slate-800 rounded-md shadow-lg border border-slate-200 dark:border-slate-700 p-5 flex justify-end gap-3 lg:hidden">
              <button 
                type="button" 
                onClick={() => navigate(`/medical-records/${patientId}`)} 
                className="px-5 py-2.5 rounded-md font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={createMutation.isPending}
                className="px-6 py-2.5 rounded-md font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 shadow-sm"
              >
                {createMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar Atendimento'}
              </button>
            </div>
          </div>

          {/* Right Sidebar Column */}
          <div className="space-y-6">
            
            {/* Revisão Clínica (Anamnese) */}
            <div className={`p-5 rounded-md border-2 transition-colors shadow-lg ${clinicalDataReviewed ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : 'border-blue-500 bg-white dark:bg-slate-800'}`}>
              <div className="flex flex-col gap-3 mb-5 border-b border-slate-200 dark:border-slate-700/60 pb-4">
                <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Activity className="w-4 h-4" /> Revisão Clínica
                </h2>
                <label className="flex items-center gap-2 cursor-pointer bg-white dark:bg-slate-900/50 p-3 rounded-md shadow-sm border border-slate-200 dark:border-slate-700">
                  <input 
                    type="checkbox" 
                    checked={clinicalDataReviewed}
                    onChange={e => setClinicalDataReviewed(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded-md border-slate-300 focus:ring-blue-500" 
                  />
                  <span className="font-semibold text-sm text-slate-700 dark:text-slate-300">Confirmo os dados clínicos</span>
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <label className="flex items-center gap-2 p-3 bg-white dark:bg-slate-900/50 rounded-md border border-slate-200 dark:border-slate-700">
                  <input type="checkbox" checked={anamnesis.isHypertensive} onChange={e => setAnamnesis({...anamnesis, isHypertensive: e.target.checked})} className="w-4 h-4 rounded-md text-blue-600 border-slate-300 focus:ring-blue-500" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Hipertenso</span>
                </label>
                <label className="flex items-center gap-2 p-3 bg-white dark:bg-slate-900/50 rounded-md border border-slate-200 dark:border-slate-700">
                  <input type="checkbox" checked={anamnesis.isDiabetic} onChange={e => setAnamnesis({...anamnesis, isDiabetic: e.target.checked})} className="w-4 h-4 rounded-md text-blue-600 border-slate-300 focus:ring-blue-500" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Diabético</span>
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 mt-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Alergias</label>
                  <input type="text" value={anamnesis.allergies} onChange={e => setAnamnesis({...anamnesis, allergies: e.target.value})} placeholder="Ex: Dipirona, Penicilina" className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Outras Doenças</label>
                  <input type="text" value={anamnesis.otherDiseases} onChange={e => setAnamnesis({...anamnesis, otherDiseases: e.target.value})} placeholder="Ex: Asma, Hipotireoidismo" className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-900 dark:text-white" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 mt-3">
                <div className="p-3 bg-white dark:bg-slate-900/50 rounded-md border border-slate-200 dark:border-slate-700">
                  <label className="flex items-center gap-2 mb-2">
                    <input type="checkbox" checked={anamnesis.isOncological} onChange={e => setAnamnesis({...anamnesis, isOncological: e.target.checked})} className="w-4 h-4 rounded-md text-blue-600 border-slate-300 focus:ring-blue-500" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Paciente Oncológico</span>
                  </label>
                  {anamnesis.isOncological && (
                    <select
                      value={anamnesis.oncologicalStage}
                      onChange={e => setAnamnesis({...anamnesis, oncologicalStage: e.target.value})}
                      className="w-full mt-2 px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="" disabled>Selecione o estágio/fase...</option>
                      <option value="Estágio I">Estágio I</option>
                      <option value="Estágio II">Estágio II</option>
                      <option value="Estágio III">Estágio III</option>
                      <option value="Estágio IV">Estágio IV</option>
                      <option value="Em Remissão">Em Remissão</option>
                      <option value="Cuidados Paliativos">Cuidados Paliativos</option>
                      <option value="Não Classificado / Outro">Não Classificado / Outro</option>
                    </select>
                  )}
                </div>
                
                <div className="p-3 bg-white dark:bg-slate-900/50 rounded-md border border-slate-200 dark:border-slate-700">
                  <label className="flex items-center gap-2 mb-2">
                    <input type="checkbox" checked={anamnesis.isPcd} onChange={e => setAnamnesis({...anamnesis, isPcd: e.target.checked})} className="w-4 h-4 rounded-md text-blue-600 border-slate-300 focus:ring-blue-500" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Pessoa com Deficiência</span>
                  </label>
                  {anamnesis.isPcd && (
                    <input type="text" value={anamnesis.pcdDescription} onChange={e => setAnamnesis({...anamnesis, pcdDescription: e.target.value})} placeholder="Descrição" className="w-full mt-2 px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
                  )}
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Uso Contínuo (1 por linha)</label>
                <textarea 
                  value={anamnesis.continuousMedications.join('\n')} 
                  onChange={e => setAnamnesis({...anamnesis, continuousMedications: e.target.value.split('\n')})} 
                  rows={3} 
                  className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-900 dark:text-white" 
                />
              </div>
            </div>

            {/* Retorno */}
            <div className="bg-white dark:bg-slate-800 rounded-md shadow-lg border border-slate-200 dark:border-slate-700 p-5">
              <div className="flex flex-col gap-3 mb-4">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Agendar Retorno <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300">
                    <input type="radio" name="hasReturn" checked={!hasReturn} onChange={() => { setHasReturn(false); setReturnValue(''); }} className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800" />
                    Não
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300">
                    <input type="radio" name="hasReturn" checked={hasReturn} onChange={() => setHasReturn(true)} className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800" />
                    Sim
                  </label>
                </div>
              </div>
              
              {hasReturn && (
                <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <input
                    type="number"
                    value={returnValue}
                    onChange={e => setReturnValue(e.target.value)}
                    className="w-1/2 px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="Valor (Ex: 15)"
                  />
                  <select
                    value={returnUnit}
                    onChange={e => setReturnUnit(e.target.value)}
                    className="w-1/2 px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="DIAS">Dias</option>
                    <option value="MESES">Meses</option>
                    <option value="ANOS">Anos</option>
                  </select>
                </div>
              )}
            </div>

            {/* Uploads */}
            <div className="bg-white dark:bg-slate-800 rounded-md shadow-lg border border-slate-200 dark:border-slate-700 p-5">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                Anexos do Prontuário
              </label>
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-md p-4 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/30 hover:bg-slate-100 dark:hover:bg-slate-900/50 transition-colors">
                <Upload className="w-6 h-6 text-slate-400 mb-2" />
                <p className="text-xs text-slate-500 text-center mb-3">
                  PDF, JPG, PNG
                </p>
                <label className="cursor-pointer bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 px-4 py-2 rounded-md text-xs font-semibold hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors">
                  Buscar Arquivos
                  <input type="file" multiple accept=".pdf,image/png,image/jpeg,image/jpg" className="hidden" onChange={handleFileChange} />
                </label>
              </div>

              {files.length > 0 && (
                <div className="mt-3 flex flex-col gap-2">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 bg-slate-100 dark:bg-slate-900/80 rounded-md border border-slate-200 dark:border-slate-700">
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate mr-2">{f.name}</span>
                      <button type="button" onClick={() => removeFile(i)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md p-1">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons for Desktop */}
            <div className="hidden lg:flex bg-white dark:bg-slate-800 rounded-md shadow-lg border border-slate-200 dark:border-slate-700 p-5 flex-col gap-3">
              <button 
                type="submit" 
                disabled={createMutation.isPending}
                className="w-full py-3 rounded-md font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
              >
                {createMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar Atendimento'}
              </button>
              <button 
                type="button" 
                onClick={() => navigate(`/medical-records/${patientId}`)} 
                className="w-full py-2.5 rounded-md font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>

        </div>
      </form>
    </div>
  );
};

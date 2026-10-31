import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useCreateMedicalRecord } from '../../hooks/useMedicalRecords';
import { usePatient } from '../../hooks/usePatients';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import axios from 'axios';
import { useAuthStore } from '../../store/useAuthStore';
import { useDoctors } from '../../hooks/useDoctors';
import { X, Loader2, Upload, Plus, Trash2, ArrowLeft, Activity, Search, CheckCircle2, ChevronRight, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import imageCompression from 'browser-image-compression';
import { MedicationSelect } from './MedicationSelect';
import { PrescriptionPrintModal } from '../../components/PrescriptionPrintModal';
import { MedicalCertificateModal } from '../../components/MedicalCertificateModal';
import { ApacReportModal } from '../../components/ApacReportModal';
import { MedicalDocumentDropdown } from '../../components/MedicalDocumentDropdown';
import { resolveExecutingUnit } from '../../utils/executingUnit';

export const CreateRecord: React.FC = () => {
  const { id: patientId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { appointment?: any; executingUnit?: { name: string; cnes: string } } | undefined;
  const createMutation = useCreateMedicalRecord();
  const { token, user, permissions } = useAuthStore();
  const isAdmin = permissions.includes('admin:access');
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const { data: patient } = usePatient(patientId!);

  // Unidade Executante vinculada no agendamento (e-SUS) ou armazenamento
  const executingUnit = useMemo(() => {
    return resolveExecutingUnit([
      locationState?.executingUnit,
      locationState?.appointment,
      patient?.healthCenter,
    ]);
  }, [locationState, patient]);
  
  const { data: doctorsData } = useDoctors(isAdmin ? { limit: 1000 } : { userId: user?.id });
  const doctors = doctorsData?.data || [];
  
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const currentDoctor = isAdmin ? doctors.find(d => d.userId === selectedDoctorId) : doctors[0];
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isAnamnesisEditing, setIsAnamnesisEditing] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isCertificateModalOpen, setIsCertificateModalOpen] = useState(false);
  const [isApacModalOpen, setIsApacModalOpen] = useState(false);
  const [certificateDocType, setCertificateDocType] = useState<'atestado' | 'declaracao'>('atestado');

  const [observation, setObservation] = useState('');
  const [selectedCids, setSelectedCids] = useState<string[]>([]);
  const [cidSearchTerm, setCidSearchTerm] = useState('');
  const [modalCidSearchTerm, setModalCidSearchTerm] = useState('');
  const [debouncedModalCidSearchTerm, setDebouncedModalCidSearchTerm] = useState('');
  const [isCidDropdownOpen, setIsCidDropdownOpen] = useState(false);
  const [procSearchTerm, setProcSearchTerm] = useState('');
  const [modalProcSearchTerm, setModalProcSearchTerm] = useState('');
  const [debouncedModalProcSearchTerm, setDebouncedModalProcSearchTerm] = useState('');
  const [isProcDropdownOpen, setIsProcDropdownOpen] = useState(false);

  React.useEffect(() => {
    const handler = setTimeout(() => setDebouncedModalCidSearchTerm(modalCidSearchTerm), 400);
    return () => clearTimeout(handler);
  }, [modalCidSearchTerm]);

  const { data: cidResults, isLoading: isSearchingCid, isFetching: isFetchingCid } = useQuery({
    queryKey: ['cid-search', debouncedModalCidSearchTerm],
    queryFn: async () => {
      const res = await axios.get(`${apiUrl}/cid10/search?q=${debouncedModalCidSearchTerm}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data;
    },
    enabled: isCidDropdownOpen,
    placeholderData: keepPreviousData,
  });

  React.useEffect(() => {
    const handler = setTimeout(() => setDebouncedModalProcSearchTerm(modalProcSearchTerm), 400);
    return () => clearTimeout(handler);
  }, [modalProcSearchTerm]);

  const { data: procResults, isLoading: isSearchingProc, isFetching: isFetchingProc } = useQuery({
    queryKey: ['proc-search', debouncedModalProcSearchTerm],
    queryFn: async () => {
      const res = await axios.get(`${apiUrl}/procedures?search=${debouncedModalProcSearchTerm}&limit=20`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data.data;
    },
    enabled: isProcDropdownOpen,
    placeholderData: keepPreviousData,
  });

  const [hasReturn, setHasReturn] = useState(false);
  const [returnValue, setReturnValue] = useState('');
  const [returnUnit, setReturnUnit] = useState('DIAS');
  
  const [medications, setMedications] = useState<{name: string, dosage: string}[]>([]);
  const [requestedExams, setRequestedExams] = useState<string[]>([]);
  
  const addCid = (cidString: string) => {
    const code = cidString.split(' - ')[0]?.trim().toLowerCase();
    const isDuplicate = selectedCids.some(c => c.split(' - ')[0]?.trim().toLowerCase() === code);
    if (isDuplicate) {
      toast.warning('Este CID já foi adicionado.');
      return;
    }
    if (selectedCids.length >= 3) {
      toast.error('Você pode adicionar no máximo 3 CIDs.');
      return;
    }
    setSelectedCids(prev => [...prev, cidString]);
  };

  const removeCid = (index: number) => {
    setSelectedCids(prev => prev.filter((_, i) => i !== index));
  };

  // Auto-complete CID
  React.useEffect(() => {
    if (cidSearchTerm.length >= 3) {
      const timeoutId = setTimeout(async () => {
        try {
          const res = await axios.get(`${apiUrl}/cid10/search?q=${cidSearchTerm}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const exactMatch = res.data.find((item: any) => 
            item.code.replace('.', '').toLowerCase() === cidSearchTerm.replace('.', '').toLowerCase()
          );
          if (exactMatch) {
            addCid(`${exactMatch.code} - ${exactMatch.description}`);
            setCidSearchTerm('');
          }
        } catch (err) {
          console.error(err);
        }
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [cidSearchTerm, selectedCids, apiUrl, token]);

  // Auto-complete procedures
  React.useEffect(() => {
    if (procSearchTerm.length >= 3) {
      const timeoutId = setTimeout(async () => {
        try {
          const res = await axios.get(`${apiUrl}/procedures?search=${procSearchTerm}&limit=20`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const exactMatch = res.data.data.find((item: any) => 
            item.code.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === procSearchTerm.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
          );
          if (exactMatch) {
            const formatted = `${exactMatch.code} - ${exactMatch.name}`;
            addExam(formatted);
            setProcSearchTerm(''); // clear to allow new searches
          }
        } catch (err) {
          console.error(err);
        }
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [procSearchTerm, requestedExams, apiUrl, token]);

  const [medicationsJustification, setMedicationsJustification] = useState('');
  const [examsJustification, setExamsJustification] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isOci, setIsOci] = useState(false);
  
  const [anamnesis, setAnamnesis] = useState({
    isHypertensive: false,
    isDiabetic: false,
    isSmoker: false,
    otherDiseases: '',
    isOncological: false,
    oncologicalStage: '',
    allergies: '',
    isPcd: false,
    pcdDescription: '',
    continuousMedications: [] as string[],
    bloodPressure: '',
    glycemia: '',
    weight: '',
    height: ''
  });
  const [clinicalDataReviewed, setClinicalDataReviewed] = useState(false);
  const [hasAnamnesis, setHasAnamnesis] = useState(true);

  React.useEffect(() => {
    if (patient) {
      if (patient.patientAnamnesis) {
        setAnamnesis({
        isHypertensive: patient.patientAnamnesis.isHypertensive || false,
        isDiabetic: patient.patientAnamnesis.isDiabetic || false,
        isSmoker: patient.patientAnamnesis.isSmoker || false,
        otherDiseases: patient.patientAnamnesis.otherDiseases || '',
        isOncological: patient.patientAnamnesis.isOncological || false,
        oncologicalStage: patient.patientAnamnesis.oncologicalStage || '',
        allergies: patient.patientAnamnesis.allergies || '',
        isPcd: patient.patientAnamnesis.isPcd || false,
        pcdDescription: patient.patientAnamnesis.pcdDescription || '',
        continuousMedications: patient.patientAnamnesis.continuousMedications || [],
        bloodPressure: patient.patientAnamnesis.bloodPressure || '',
        glycemia: patient.patientAnamnesis.glycemia || '',
        weight: patient.patientAnamnesis.weight || '',
        height: patient.patientAnamnesis.height || '',
        });
        setHasAnamnesis(true);
        setIsAnamnesisEditing(false);
      } else {
        setHasAnamnesis(false);
        setIsAnamnesisEditing(true);
      }
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
    const code = examName.split(' - ')[0]?.trim().toLowerCase();
    const isDuplicate = requestedExams.some(e => e.split(' - ')[0]?.trim().toLowerCase() === code);
    if (isDuplicate) {
      toast.warning('Este procedimento já foi adicionado.');
      return;
    }
    setRequestedExams(prev => [...prev, examName]);
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

  const validateStep2 = () => {
    if (isAdmin && !selectedDoctorId) {
      toast.error('Selecione o médico responsável pelo atendimento.');
      return false;
    }
    if (!observation.trim()) {
      toast.error('O prontuário precisa de uma observação clínica.');
      return false;
    }
    if (selectedCids.length === 0) {
      toast.error('O CID Primário é obrigatório.');
      return false;
    }
    const validMeds = medications.filter(m => m.name.trim() !== '');
    if (validMeds.length > 0 && !medicationsJustification.trim()) {
      toast.error('A justificativa da prescrição médica é obrigatória.');
      return false;
    }
    const validExams = requestedExams.filter(e => e.trim() !== '');
    if (validExams.length > 0 && !examsJustification.trim()) {
      toast.error('A justificativa do exame/procedimento é obrigatória.');
      return false;
    }
    if (hasReturn && !returnValue) {
      toast.error('O tempo de retorno é obrigatório quando solicitado.');
      return false;
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicalDataReviewed) {
      toast.error('A revisão e confirmação dos dados clínicos da anamnese é obrigatória.');
      setCurrentStep(1);
      return;
    }
    if (!validateStep2()) {
      setCurrentStep(2);
      return;
    }
    if (!patientId) return;

    const formData = new FormData();
    if (isAdmin && selectedDoctorId) {
      formData.append('doctorId', selectedDoctorId);
    }
    formData.append('observation', observation);
    if (selectedCids[0]) formData.append('cid10', selectedCids[0].split(' - ')[0]);
    if (selectedCids[1]) formData.append('cid10Secondary', selectedCids[1].split(' - ')[0]);
    if (selectedCids[2]) formData.append('cid10AssociatedCauses', selectedCids[2].split(' - ')[0]);
    
    if (hasReturn && returnValue) {
      formData.append('returnRequestedValue', returnValue);
      formData.append('returnRequestedUnit', returnUnit);
    }
    formData.append('isOci', isOci.toString());

    const validMeds = medications.filter(m => m.name.trim() !== '');
    if (validMeds.length > 0) {
      formData.append('medications', JSON.stringify(validMeds));
      formData.append('medicationsJustification', medicationsJustification);
    }

    const validExams = requestedExams.filter(e => e.trim() !== '');
    if (validExams.length > 0) {
      formData.append('requestedExams', JSON.stringify(validExams));
      formData.append('examsJustification', examsJustification);
    }

    if (executingUnit.name) {
      formData.append('executingUnitName', executingUnit.name);
    }
    if (executingUnit.cnes) {
      formData.append('executingUnitCnes', executingUnit.cnes);
    }

    files.forEach(file => {
      formData.append('attachments', file);
    });

    formData.append('clinicalDataReviewed', clinicalDataReviewed.toString());
    formData.append('anamnesis', JSON.stringify(anamnesis));

    createMutation.mutate({
      patientId,
      formData 
    }, {
      onSuccess: () => {
        toast.success('Atendimento salvo com sucesso!');
        navigate(`/medical-records/${patientId}`);
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.message || 'Erro ao salvar atendimento');
      }
    });
  };

  if (!patient) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 max-w-5xl">
      
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-6 h-6 text-blue-500" /> Novo Atendimento
            </h1>
          </div>
          <div className="text-slate-600 dark:text-slate-400 pl-11 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>
              Paciente: <strong className="text-slate-800 dark:text-slate-200">{patient.name}</strong>
            </span>
            {executingUnit.name && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                <Building2 className="w-3.5 h-3.5" />
                <span>{executingUnit.name}</span>
                {executingUnit.cnes && (
                  <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400">({executingUnit.cnes})</span>
                )}
              </span>
            )}
          </div>
        </div>
        
        {/* Stepper */}
        <div className="flex items-center gap-1 sm:gap-2 text-sm font-medium">
          {/* STEP 1 */}
          <div className={`flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-full ${currentStep === 1 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400' : currentStep > 1 ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white ${currentStep === 1 ? 'bg-blue-600 dark:bg-blue-500' : currentStep > 1 ? 'bg-green-600 dark:bg-green-500' : 'bg-slate-400 dark:bg-slate-500'}`}>1</span>
            <span className={currentStep === 1 ? 'inline' : 'hidden sm:inline'}>Anamnese</span>
          </div>

          <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
          
          {/* STEP 2 */}
          <div className={`flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-full ${currentStep === 2 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400' : currentStep > 2 ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white ${currentStep === 2 ? 'bg-blue-600 dark:bg-blue-500' : currentStep > 2 ? 'bg-green-600 dark:bg-green-500' : 'bg-slate-400 dark:bg-slate-500'}`}>2</span>
            <span className={currentStep === 2 ? 'inline' : 'hidden sm:inline'}>Atendimento</span>
          </div>

          <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
          
          {/* STEP 3 */}
          <div className={`flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-full ${currentStep === 3 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white ${currentStep === 3 ? 'bg-blue-600 dark:bg-blue-500' : 'bg-slate-400 dark:bg-slate-500'}`}>3</span>
            <span className={currentStep === 3 ? 'inline' : 'hidden sm:inline'}>Revisão</span>
          </div>
        </div>
      </div>

      <form id="record-form" onSubmit={handleSubmit}>
        
        {/* STEP 1: ANAMNESE */}
        {currentStep === 1 && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Revisão da Anamnese</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Confirme verbalmente os dados com o paciente.</p>
              </div>
              {hasAnamnesis && (
                <button 
                  type="button"
                  onClick={() => setIsAnamnesisEditing(!isAnamnesisEditing)}
                  className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${isAnamnesisEditing ? 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200' : 'bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400'}`}
                >
                  {isAnamnesisEditing ? 'Cancelar Edição' : 'Alterar Dados'}
                </button>
              )}
            </div>
            
            <div className="p-6">
              {isAnamnesisEditing ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <label className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-md border border-slate-200 dark:border-slate-700 cursor-pointer">
                      <input type="checkbox" checked={anamnesis.isHypertensive} onChange={e => setAnamnesis({...anamnesis, isHypertensive: e.target.checked})} className="w-5 h-5 text-blue-600 rounded" />
                      <span className="font-medium text-slate-700 dark:text-slate-300">Hipertenso</span>
                    </label>
                    <label className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-md border border-slate-200 dark:border-slate-700 cursor-pointer">
                      <input type="checkbox" checked={anamnesis.isDiabetic} onChange={e => setAnamnesis({...anamnesis, isDiabetic: e.target.checked})} className="w-5 h-5 text-blue-600 rounded" />
                      <span className="font-medium text-slate-700 dark:text-slate-300">Diabético</span>
                    </label>
                    <label className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-md border border-slate-200 dark:border-slate-700 cursor-pointer">
                      <input type="checkbox" checked={anamnesis.isSmoker} onChange={e => setAnamnesis({...anamnesis, isSmoker: e.target.checked})} className="w-5 h-5 text-blue-600 rounded" />
                      <span className="font-medium text-slate-700 dark:text-slate-300">Fumante</span>
                    </label>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Alergias</label>
                      <input type="text" value={anamnesis.allergies} onChange={e => setAnamnesis({...anamnesis, allergies: e.target.value})} placeholder="Ex: Dipirona..." className="w-full px-4 py-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Outras Doenças</label>
                      <input type="text" value={anamnesis.otherDiseases} onChange={e => setAnamnesis({...anamnesis, otherDiseases: e.target.value})} placeholder="Ex: Asma..." className="w-full px-4 py-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Pressão Arterial</label>
                      <input type="text" value={anamnesis.bloodPressure} onChange={e => setAnamnesis({...anamnesis, bloodPressure: e.target.value})} placeholder="Ex: 120/80 mmHg" className="w-full px-4 py-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Glicemia</label>
                      <input type="text" value={anamnesis.glycemia} onChange={e => setAnamnesis({...anamnesis, glycemia: e.target.value})} placeholder="Ex: 90 mg/dL" className="w-full px-4 py-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Peso</label>
                      <input type="text" value={anamnesis.weight} onChange={e => setAnamnesis({...anamnesis, weight: e.target.value})} placeholder="Ex: 70 kg" className="w-full px-4 py-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Altura</label>
                      <input type="text" value={anamnesis.height} onChange={e => setAnamnesis({...anamnesis, height: e.target.value})} placeholder="Ex: 1.75 m" className="w-full px-4 py-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-md border border-slate-200 dark:border-slate-700">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={anamnesis.isOncological} onChange={e => setAnamnesis({...anamnesis, isOncological: e.target.checked})} className="w-5 h-5 text-blue-600 rounded" />
                        <span className="font-medium text-slate-700 dark:text-slate-300">Paciente Oncológico</span>
                      </label>
                      {anamnesis.isOncological && (
                        <select
                          value={anamnesis.oncologicalStage}
                          onChange={e => setAnamnesis({...anamnesis, oncologicalStage: e.target.value})}
                          className="w-full mt-4 px-4 py-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        >
                          <option value="" disabled>Selecione o estágio...</option>
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
                    
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-md border border-slate-200 dark:border-slate-700">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={anamnesis.isPcd} onChange={e => setAnamnesis({...anamnesis, isPcd: e.target.checked})} className="w-5 h-5 text-blue-600 rounded" />
                        <span className="font-medium text-slate-700 dark:text-slate-300">Pessoa com Deficiência</span>
                      </label>
                      {anamnesis.isPcd && (
                        <input type="text" value={anamnesis.pcdDescription} onChange={e => setAnamnesis({...anamnesis, pcdDescription: e.target.value})} placeholder="Descrição da deficiência" className="w-full mt-4 px-4 py-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Uso Contínuo (1 por linha)</label>
                    <textarea 
                      value={anamnesis.continuousMedications.join('\n')} 
                      onChange={e => setAnamnesis({...anamnesis, continuousMedications: e.target.value.split('\n')})} 
                      rows={4} 
                      className="w-full px-4 py-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" 
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-wrap gap-3">
                    {anamnesis.isHypertensive && <span className="px-3 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full text-sm font-semibold">Hipertenso</span>}
                    {anamnesis.isDiabetic && <span className="px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full text-sm font-semibold">Diabético</span>}
                    {anamnesis.isSmoker && <span className="px-3 py-1 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded-full text-sm font-semibold">Fumante</span>}
                    {anamnesis.isOncological && <span className="px-3 py-1 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded-full text-sm font-semibold">Oncológico {anamnesis.oncologicalStage ? `(${anamnesis.oncologicalStage})` : ''}</span>}
                    {anamnesis.isPcd && <span className="px-3 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full text-sm font-semibold">PcD {anamnesis.pcdDescription ? `(${anamnesis.pcdDescription})` : ''}</span>}
                    
                    {!anamnesis.isHypertensive && !anamnesis.isDiabetic && !anamnesis.isSmoker && !anamnesis.isOncological && !anamnesis.isPcd && (
                      <span className="text-slate-500 italic">Nenhuma condição especial cadastrada.</span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Alergias</h4>
                      <p className="text-slate-800 dark:text-slate-200">{anamnesis.allergies || 'Nenhuma informada'}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Outras Doenças</h4>
                      <p className="text-slate-800 dark:text-slate-200">{anamnesis.otherDiseases || 'Nenhuma informada'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Pressão Arterial</h4>
                      <p className="text-slate-800 dark:text-slate-200">{anamnesis.bloodPressure || 'Não informada'}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Glicemia</h4>
                      <p className="text-slate-800 dark:text-slate-200">{anamnesis.glycemia || 'Não informada'}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Peso</h4>
                      <p className="text-slate-800 dark:text-slate-200">{anamnesis.weight || 'Não informado'}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Altura</h4>
                      <p className="text-slate-800 dark:text-slate-200">{anamnesis.height || 'Não informada'}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Medicamentos de Uso Contínuo</h4>
                    {anamnesis.continuousMedications.length > 0 && anamnesis.continuousMedications[0] !== "" ? (
                      <ul className="list-disc pl-5 text-slate-800 dark:text-slate-200 space-y-1">
                        {anamnesis.continuousMedications.filter(m => m.trim() !== '').map((med, i) => (
                          <li key={i}>{med}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-slate-500 italic">Nenhum informado</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-center justify-between gap-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={clinicalDataReviewed}
                  onChange={e => setClinicalDataReviewed(e.target.checked)}
                  className="w-5 h-5 text-green-600 rounded border-slate-300 focus:ring-green-500" 
                />
                <span className="font-bold text-slate-800 dark:text-white">Confirmo verbalmente os dados acima</span>
              </label>
              
              <button
                type="button"
                onClick={() => {
                  if (!clinicalDataReviewed) {
                    toast.error("Você precisa confirmar os dados clínicos antes de avançar.");
                    return;
                  }
                  setCurrentStep(2);
                }}
                className="w-full md:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold transition-colors flex items-center justify-center gap-2"
              >
                Avançar para Atendimento <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: ATENDIMENTO */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-6 space-y-8">
              
              {/* PROFESSIONAL INFO */}
              <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-md border border-slate-200 dark:border-slate-700">
                <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-500" />
                  Profissional Responsável
                </h3>
                {isAdmin ? (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Selecione o Médico</label>
                    <select
                      value={selectedDoctorId}
                      onChange={(e) => setSelectedDoctorId(e.target.value)}
                      className="block w-full border border-slate-300 dark:border-slate-700 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    >
                      <option value="">Selecione...</option>
                      {doctors.map(d => (
                        <option key={d.userId} value={d.userId || d.id}>
                          {d.name} (CRM: {d.crm}/{d.crmState} {d.cns ? `- CNS: ${d.cns}` : ''})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="text-sm text-slate-700 dark:text-slate-300 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <p><strong>Nome:</strong> {currentDoctor?.name || user?.name}</p>
                    <p><strong>CRM:</strong> {currentDoctor?.crm ? `${currentDoctor.crm}/${currentDoctor.crmState}` : 'Não informado'}</p>
                    <p><strong>CNS:</strong> {currentDoctor?.cns || 'Não informado'}</p>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-3 p-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-md">
                <input type="checkbox" id="oci" checked={isOci} onChange={e => setIsOci(e.target.checked)} className="w-5 h-5 rounded-md text-orange-600 border-orange-300 focus:ring-orange-500" />
                <label htmlFor="oci" className="text-sm font-bold text-orange-800 dark:text-orange-300 cursor-pointer">
                  Este atendimento se refere a uma Oferta de Cuidados Integrados (OCI)?
                </label>
              </div>

              <div>
                <label className="block text-base font-bold text-slate-800 dark:text-white mb-2">
                  História Clínica / Prescrição <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={observation}
                  onChange={e => setObservation(e.target.value)}
                  rows={8}
                  className="w-full p-4 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="Descreva a anamnese atual, exame físico e conduta adotada..."
                />
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-md border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-800 dark:text-white">
                    Classificação Internacional de Doenças (CIDs) <span className="text-red-500">*</span>
                  </h3>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {selectedCids.length}/3 selecionados
                  </span>
                </div>
                <div className="relative mb-4">
                  <input
                    type="text"
                    value={cidSearchTerm}
                    onChange={e => setCidSearchTerm(e.target.value)}
                    className="w-full pl-4 pr-12 py-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                    placeholder={selectedCids.length >= 3 ? "Limite máximo de 3 CIDs atingido" : "Digite o código exato ou busque na lupa..."}
                    disabled={selectedCids.length >= 3}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setModalCidSearchTerm(cidSearchTerm);
                      setIsCidDropdownOpen(true);
                    }}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={selectedCids.length >= 3}
                  >
                    <Search className="w-5 h-5" />
                  </button>
                  {isCidDropdownOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                      <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                          <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <Search className="w-5 h-5 text-blue-500" /> Pesquisar CIDs
                          </h3>
                          <button type="button" onClick={() => setIsCidDropdownOpen(false)} className="p-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                        
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                          <input
                            type="text"
                            value={modalCidSearchTerm}
                            onChange={e => setModalCidSearchTerm(e.target.value)}
                            className="w-full px-4 py-3 text-base rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                            placeholder="Pesquise por código ou descrição..."
                            autoFocus
                          />
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-2 relative">
                          {isSearchingCid ? (
                            <div className="p-8 text-center text-slate-500 dark:text-slate-400">Buscando...</div>
                          ) : (
                            <>
                              {isFetchingCid && (
                                <div className="absolute top-2 right-4 text-xs font-semibold text-blue-500 flex items-center gap-1 animate-pulse z-10 bg-blue-50 dark:bg-blue-900/50 px-2 py-1 rounded-full">
                                  <Loader2 className="w-3 h-3 animate-spin" /> Atualizando...
                                </div>
                              )}
                              {cidResults?.length > 0 ? (
                                <div className="space-y-1 mt-1">
                                  {cidResults.map((item: any) => {
                                    const isAlreadySelected = selectedCids.some(c => c.split(' - ')[0]?.trim().toLowerCase() === item.code.trim().toLowerCase());
                                    return (
                                      <button
                                        key={item.code}
                                        type="button"
                                        disabled={isAlreadySelected}
                                        onClick={() => {
                                          addCid(`${item.code} - ${item.description}`);
                                          setCidSearchTerm('');
                                          setIsCidDropdownOpen(false);
                                        }}
                                        className={`w-full text-left p-3 rounded-md transition-colors border ${
                                          isAlreadySelected
                                            ? 'bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-60'
                                            : 'hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-700 dark:text-slate-300 border-transparent hover:border-blue-200 dark:hover:border-blue-800'
                                        }`}
                                      >
                                        <div className="flex items-center justify-between">
                                          <span className="font-bold text-blue-700 dark:text-blue-400">{item.code}</span>
                                          {isAlreadySelected && (
                                            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                              Já selecionado
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-sm mt-1">{item.description}</div>
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="p-8 text-center text-slate-500 dark:text-slate-400">Nenhum resultado encontrado.</div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {selectedCids.length > 0 && (
                  <div className="space-y-2">
                    {selectedCids.map((cidItem, index) => {
                      const badgeLabel = index === 0 ? 'CID Primário' : index === 1 ? 'CID Secundário' : 'CID Causas Associadas';
                      const badgeColor = index === 0
                        ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
                        : index === 1
                        ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800'
                        : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800';

                      return (
                        <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-sm">
                          <div className="flex flex-col">
                            <span className={`text-xs font-bold w-fit px-2 py-0.5 rounded border mb-1.5 ${badgeColor}`}>
                              {badgeLabel} {index === 0 ? '(Obrigatório)' : '(Opcional)'}
                            </span>
                            <span className="text-sm text-slate-700 dark:text-slate-200 font-medium">{cidItem}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeCid(index)}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                            title={`Remover ${badgeLabel}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-md border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-800 dark:text-white">Medicações (Opcional)</h3>
                  <button type="button" onClick={addMed} className="text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-md text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 shadow-sm">
                    <Plus className="w-4 h-4" /> Adicionar
                  </button>
                </div>
                
                <div className="space-y-3">
                  {medications.map((med, idx) => (
                    <MedicationSelect
                      key={idx}
                      value={med}
                      onChange={(field, val) => updateMed(idx, field, val)}
                      onRemove={() => removeMed(idx)}
                    />
                  ))}
                </div>

                {medications.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Justificativa da Prescrição <span className="text-red-500">*</span></label>
                    <textarea
                      value={medicationsJustification}
                      onChange={e => setMedicationsJustification(e.target.value)}
                      rows={3}
                      className="w-full p-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      placeholder="Justifique o uso..."
                    />
                  </div>
                )}
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-md border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-800 dark:text-white">Exames e Procedimentos (Opcional)</h3>
                  {requestedExams.length > 0 && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      {requestedExams.length} selecionado{requestedExams.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div className="relative mb-4">
                  <input
                    type="text"
                    value={procSearchTerm}
                    onChange={e => setProcSearchTerm(e.target.value)}
                    className="w-full pl-4 pr-12 py-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="Digite o código exato ou busque na lupa..."
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setModalProcSearchTerm(procSearchTerm);
                      setIsProcDropdownOpen(true);
                    }}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-blue-500"
                  >
                    <Search className="w-5 h-5" />
                  </button>
                  {isProcDropdownOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                      <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                          <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <Search className="w-5 h-5 text-blue-500" /> Pesquisar Exames/Procedimentos
                          </h3>
                          <button type="button" onClick={() => setIsProcDropdownOpen(false)} className="p-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full">
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                        
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                          <input
                            type="text"
                            value={modalProcSearchTerm}
                            onChange={e => setModalProcSearchTerm(e.target.value)}
                            className="w-full px-4 py-3 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                            placeholder="Pesquise por código ou descrição..."
                            autoFocus
                          />
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-2 relative">
                          {isSearchingProc ? (
                            <div className="p-8 text-center text-slate-500">Buscando...</div>
                          ) : (
                            <>
                              {isFetchingProc && (
                                <div className="absolute top-2 right-4 text-xs font-semibold text-blue-500 flex items-center gap-1 animate-pulse z-10 bg-blue-50 px-2 py-1 rounded-full">
                                  <Loader2 className="w-3 h-3 animate-spin" /> Atualizando...
                                </div>
                              )}
                              {procResults?.length > 0 ? (
                                <div className="space-y-1 mt-1">
                                  {procResults.map((item: any) => {
                                    const formatted = `${item.code} - ${item.name}`;
                                    const isAlreadySelected = requestedExams.some(e => e.split(' - ')[0]?.trim().toLowerCase() === item.code.trim().toLowerCase());
                                    return (
                                      <button
                                        key={item.id}
                                        type="button"
                                        disabled={isAlreadySelected}
                                        onClick={() => {
                                          addExam(formatted);
                                          setProcSearchTerm('');
                                          setIsProcDropdownOpen(false);
                                        }}
                                        className={`w-full text-left p-3 rounded-md transition-colors border ${
                                          isAlreadySelected
                                            ? 'bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-60'
                                            : 'hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-700 dark:text-slate-300 border-transparent hover:border-blue-200 dark:hover:border-blue-800'
                                        }`}
                                      >
                                        <div className="flex items-center justify-between">
                                          <span className="font-bold text-blue-700 dark:text-blue-400">{item.code}</span>
                                          {isAlreadySelected && (
                                            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                              Já selecionado
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-sm mt-1">{item.name}</div>
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="p-8 text-center text-slate-500">Nenhum resultado encontrado.</div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {requestedExams.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
                      <span className="font-medium">Lista de procedimentos adicionados:</span>
                      {requestedExams.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setRequestedExams([])}
                          className="text-red-600 hover:text-red-700 dark:text-red-400 hover:underline cursor-pointer"
                        >
                          Limpar todos
                        </button>
                      )}
                    </div>
                    <div className="max-h-56 overflow-y-auto pr-1 space-y-1.5 rounded-md border border-slate-200 dark:border-slate-700/80 p-2 bg-slate-100/60 dark:bg-slate-950/40">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {requestedExams.map((exam, index) => {
                          const [code, ...rest] = exam.split(' - ');
                          const name = rest.join(' - ');
                          return (
                            <div
                              key={index}
                              className="flex items-center justify-between gap-2 p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-xs text-xs"
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="font-mono font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded shrink-0">
                                  {code}
                                </span>
                                <span
                                  className="text-slate-700 dark:text-slate-200 font-medium truncate"
                                  title={name || exam}
                                >
                                  {name || exam}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeExam(index)}
                                className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded shrink-0 transition-colors cursor-pointer"
                                title="Remover procedimento"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
                {requestedExams.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Justificativa <span className="text-red-500">*</span></label>
                    <textarea
                      value={examsJustification}
                      onChange={e => setExamsJustification(e.target.value)}
                      rows={3}
                      className="w-full p-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      placeholder="Justifique a solicitação..."
                    />
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-md border border-slate-200 dark:border-slate-700">
                  <label className="block font-bold text-slate-800 dark:text-white mb-4">Agendar Retorno <span className="text-red-500">*</span></label>
                  <div className="flex items-center gap-6 mb-4">
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                      <input type="radio" name="hasReturn" checked={!hasReturn} onChange={() => { setHasReturn(false); setReturnValue(''); }} className="w-4 h-4 text-blue-600" />
                      Não
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                      <input type="radio" name="hasReturn" checked={hasReturn} onChange={() => setHasReturn(true)} className="w-4 h-4 text-blue-600" />
                      Sim
                    </label>
                  </div>
                  {hasReturn && (
                    <div className="flex gap-2">
                      <input type="number" value={returnValue} onChange={e => setReturnValue(e.target.value)} className="w-1/2 px-4 py-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" placeholder="Ex: 15" />
                      <select value={returnUnit} onChange={e => setReturnUnit(e.target.value)} className="w-1/2 px-4 py-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                        <option value="DIAS">Dias</option>
                        <option value="MESES">Meses</option>
                        <option value="ANOS">Anos</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-md border border-slate-200 dark:border-slate-700">
                  <label className="block font-bold text-slate-800 dark:text-white mb-2">Anexos (Opcional)</label>
                  <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors">
                    <Upload className="w-8 h-8 text-blue-500 mb-2" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 text-center">Clique para enviar exames, receitas ou imagens</span>
                    <input type="file" multiple accept=".pdf,image/png,image/jpeg,image/jpg" className="hidden" onChange={handleFileChange} />
                  </label>
                  {files.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {files.map((f, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700">
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate mr-2">{f.name}</span>
                          <button type="button" onClick={() => removeFile(i)} className="text-red-500 hover:bg-red-50 p-1 rounded-md"><X className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>

            <div className="flex items-center justify-between">
              <button 
                type="button" 
                onClick={() => setCurrentStep(1)} 
                className="px-6 py-2.5 rounded-md font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                Voltar
              </button>
              <button 
                type="button" 
                onClick={() => {
                  if (validateStep2()) setCurrentStep(3);
                }} 
                className="px-6 py-2.5 rounded-md font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                Avançar para Revisão <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: REVISÃO */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Revisão Final do Atendimento</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Verifique se todos os dados estão corretos antes de salvar.</p>
                </div>
              </div>
              <div className="p-6 space-y-8">
                
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">História Clínica / Prescrição</h4>
                  <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap bg-slate-50 dark:bg-slate-900/50 p-4 rounded-md border border-slate-200 dark:border-slate-700">
                    {observation}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">CIDs Diagnosticados</h4>
                    <ul className="space-y-2">
                      {selectedCids.map((cid, i) => {
                        const badgeLabel = i === 0 ? 'CID Primário' : i === 1 ? 'CID Secundário' : 'CID Causas Associadas';
                        const badgeColor = i === 0
                          ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
                          : i === 1
                          ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800'
                          : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800';
                        return (
                          <li key={i} className="flex flex-col p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-md border border-slate-200 dark:border-slate-700">
                            <span className={`text-[10px] font-bold uppercase w-fit px-1.5 py-0.5 rounded border mb-1 ${badgeColor}`}>
                              {badgeLabel}
                            </span>
                            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{cid}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Retorno Agendado</h4>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-md">
                      {hasReturn ? `${returnValue} ${returnUnit}` : 'Nenhum retorno agendado'}
                    </p>
                    {isOci && (
                      <p className="mt-3 text-sm font-bold text-orange-600 bg-orange-50 dark:bg-orange-900/30 dark:text-orange-400 p-2 rounded-md">Atendimento OCI</p>
                    )}
                  </div>
                </div>

                {(medications.length > 0 || requestedExams.length > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-slate-200 dark:border-slate-700 pt-6">
                    {medications.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Medicações</h4>
                        <ul className="space-y-2 mb-3">
                          {medications.filter(m=>m.name).map((m, i) => (
                            <li key={i} className="text-sm bg-slate-50 dark:bg-slate-900/50 p-2 rounded-md border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"><span className="font-bold">{m.name}</span> - {m.dosage}</li>
                          ))}
                        </ul>
                        <div className="text-xs bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 p-2 rounded-md">
                          <strong>Justificativa:</strong> {medicationsJustification}
                        </div>
                      </div>
                    )}
                    {requestedExams.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Exames e Procedimentos Solicitados ({requestedExams.length})
                          </h4>
                        </div>
                        <div className="max-h-48 overflow-y-auto pr-1 space-y-1.5 mb-3 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-md border border-slate-200 dark:border-slate-700">
                          {requestedExams.filter(e => e).map((e, i) => {
                            const [code, ...rest] = e.split(' - ');
                            const name = rest.join(' - ');
                            return (
                              <div key={i} className="flex items-center gap-2 p-1.5 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-xs">
                                <span className="font-mono font-bold text-blue-700 dark:text-blue-400 shrink-0">
                                  {code}
                                </span>
                                <span className="text-slate-700 dark:text-slate-200 font-medium truncate" title={name || e}>
                                  {name || e}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="text-xs bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 p-2.5 rounded-md border border-amber-200 dark:border-amber-800">
                          <strong>Justificativa:</strong> {examsJustification}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {files.length > 0 && (
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Arquivos Anexados ({files.length})</h4>
                    <div className="flex gap-2 flex-wrap">
                      {files.map((f, i) => <span key={i} className="text-xs bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">{f.name}</span>)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button 
                type="button" 
                onClick={() => setCurrentStep(2)} 
                className="px-6 py-2.5 rounded-md font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                Voltar e Editar
              </button>
              <div className="flex items-center gap-3">
                <MedicalDocumentDropdown
                  label="Emitir Documentos"
                  buttonClassName="px-5 py-2.5 rounded-md font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 transition-colors flex items-center gap-2 cursor-pointer shadow-sm text-sm"
                  onSelectPrescription={() => setIsPrintModalOpen(true)}
                  onSelectCertificate={() => {
                    setCertificateDocType('atestado');
                    setIsCertificateModalOpen(true);
                  }}
                  onSelectAttendanceDeclaration={() => {
                    setCertificateDocType('declaracao');
                    setIsCertificateModalOpen(true);
                  }}
                  onSelectApacReport={() => setIsApacModalOpen(true)}
                />
                <button 
                  type="submit" 
                  disabled={createMutation.isPending}
                  className="px-8 py-2.5 rounded-md font-bold text-white bg-green-600 hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 shadow-md"
                >
                  {createMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                  Salvar Atendimento
                </button>
              </div>
            </div>
          </div>
        )}
      </form>

      {isPrintModalOpen && (
        <PrescriptionPrintModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          patient={patient}
          currentDoctor={currentDoctor}
          executingUnit={executingUnit}
          record={{
            observation,
            selectedCids,
            medications: medications.filter(m => m.name.trim()),
            medicationsJustification,
            requestedExams: requestedExams.filter(e => e.trim()),
            examsJustification,
            hasReturn,
            returnRequestedValue: returnValue,
            returnRequestedUnit: returnUnit,
            executingUnitName: executingUnit.name,
            executingUnitCnes: executingUnit.cnes,
            doctor: currentDoctor
          }}
        />
      )}

      {isCertificateModalOpen && (
        <MedicalCertificateModal
          isOpen={isCertificateModalOpen}
          onClose={() => setIsCertificateModalOpen(false)}
          initialDocType={certificateDocType}
          patient={patient}
          currentDoctor={currentDoctor}
          executingUnit={executingUnit}
          record={{
            cid10: selectedCids[0]?.split(' - ')[0],
            cid10Secondary: selectedCids[1]?.split(' - ')[0],
            cid10AssociatedCauses: selectedCids[2]?.split(' - ')[0],
            selectedCids,
            executingUnitName: executingUnit.name,
            executingUnitCnes: executingUnit.cnes,
            doctor: currentDoctor
          }}
        />
      )}

      {isApacModalOpen && (
        <ApacReportModal
          isOpen={isApacModalOpen}
          onClose={() => setIsApacModalOpen(false)}
          patient={patient}
          currentDoctor={currentDoctor}
          executingUnit={executingUnit}
          record={{
            cid10: selectedCids[0]?.split(' - ')[0],
            cid10Secondary: selectedCids[1]?.split(' - ')[0],
            cid10AssociatedCauses: selectedCids[2]?.split(' - ')[0],
            selectedCids,
            requestedExams: requestedExams.filter(e => e.trim()),
            examsJustification,
            observation,
            executingUnitName: executingUnit.name,
            executingUnitCnes: executingUnit.cnes,
            doctor: currentDoctor
          }}
        />
      )}
    </div>
  );
};

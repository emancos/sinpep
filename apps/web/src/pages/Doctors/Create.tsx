import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Stethoscope, Check, Loader2, User, ChevronRight, ClipboardList } from 'lucide-react';
import Select from 'react-select';
import { useCreateDoctor, useUpdateDoctor, useDoctor } from '../../hooks/useDoctors';
import { useSpecialties } from '../../hooks/useSpecialties';
import { useProcedures, useProcedureGroups } from '../../hooks/useProcedures';
import { Building2, Search } from 'lucide-react';

const doctorSchema = zod.object({
  name: zod.string().min(3, 'O nome deve ter pelo menos 3 caracteres'),
  cpf: zod.string().regex(/^(\d{3}|XXX)\.\d{3}\.\d{3}[-\.](\d{2}|XX)$/i, 'CPF inválido e obrigatório'),
  cns: zod.string().regex(/^\d{3}\s\d{4}\s\d{4}\s\d{4}$/, 'CNS inválido').optional().or(zod.literal('')),
  crm: zod.string().min(1, 'CRM é obrigatório'),
  crmState: zod.string().length(2, 'Informe a UF do CRM'),
  attendanceType: zod.enum(['CONSULTA', 'EXAME', 'AMBOS']),
  specialties: zod.array(zod.string()).min(1, 'Selecione no mínimo 1 especialidade'),
  procedures: zod.array(zod.string()).optional(),
  procedureGroups: zod.array(zod.string()).optional(),
  healthCenter: zod.any().refine((val) => !!val, { message: 'Vincule um estabelecimento' }),
});

export const formatCPF = (value: string) => {
  const upperValue = value.toUpperCase();
  if (upperValue.includes('X')) {
    // Permite que o usuário apague os X's e edite mantendo a máscara customizada até que não haja mais X
    return upperValue.replace(/[^0-9X\.\-]/g, '').substring(0, 14);
  }
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

export const formatCNS = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1 $2')
    .replace(/(\d{4})(\d)/, '$1 $2')
    .replace(/(\d{4})(\d)/, '$1 $2')
    .replace(/( \d{4})\d+?$/, '$1');
};

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

type FormData = zod.infer<typeof doctorSchema>;

const customSelectStyles = {
  control: () => "px-2 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-sm text-slate-900 dark:text-white shadow-sm hover:border-blue-500 transition-colors flex items-center",
  menu: () => "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md shadow-lg mt-2 overflow-hidden z-50",
  option: ({ isFocused, isSelected }: any) => `px-4 py-2 text-sm cursor-pointer ${isSelected ? 'bg-blue-600 text-white' : isFocused ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`,
  multiValue: () => "bg-blue-100 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded-md m-1 flex items-center",
  multiValueLabel: () => "px-2 py-0.5 text-xs font-semibold",
  multiValueRemove: () => "px-1.5 py-1 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-r-lg cursor-pointer transition-colors",
  input: () => "text-slate-900 dark:text-white",
  placeholder: () => "text-slate-400 dark:text-slate-500",
  singleValue: () => "text-slate-900 dark:text-white"
};

export const CreateOrEditDoctor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [step, setStep] = useState(isEditMode ? 2 : 1);
  const [isByGroup, setIsByGroup] = useState(false);
  
  // CNES Search State
  const [cnesSearchTerm, setCnesSearchTerm] = useState('');
  const [cnesResults, setCnesResults] = useState<any[]>([]);
  const [isSearchingCnes, setIsSearchingCnes] = useState(false);
  const [hasSearchedAndFailed, setHasSearchedAndFailed] = useState(false);
  const [manualCnesData, setManualCnesData] = useState({ coCnes: '', noFantasia: '', noMunicipio: '', sgUf: 'PB' });

  // Professional Search State
  const [proSearchTerm, setProSearchTerm] = useState('');
  const [proResults, setProResults] = useState<any[]>([]);
  const [isSearchingPro, setIsSearchingPro] = useState(false);
  const [hasSearchedProAndFailed, setHasSearchedProAndFailed] = useState(false);
  const [isCnsDisabled, setIsCnsDisabled] = useState(false);

  const { data: doctor, isLoading: loadingDoctor } = useDoctor(id);
  const { data: specialtiesData, isLoading: loadingSpecialties } = useSpecialties({ page: 1, limit: 1000 });
  const { data: proceduresData, isLoading: loadingProcedures } = useProcedures({ page: 1, limit: 1000 });
  const { data: procedureGroupsData, isLoading: loadingProcedureGroups } = useProcedureGroups(false);

  const createMutation = useCreateDoctor();
  const updateMutation = useUpdateDoctor();

  const {
    control,
    handleSubmit,
    reset,
    watch,
    trigger,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(doctorSchema),
    defaultValues: {
      name: '',
      cpf: '',
      cns: '',
      crm: '',
      crmState: 'PB',
      attendanceType: 'CONSULTA',
      specialties: [],
      procedures: [],
      procedureGroups: [],
      healthCenter: null,
    },
  });

  const currentValues = watch();
  const attendanceType = currentValues.attendanceType;

  useEffect(() => {
    if (isEditMode && doctor) {
      reset({
        name: doctor.user?.name || '',
        cpf: doctor.cpf || '',
        cns: doctor.cns || '',
        crm: doctor.crm,
        crmState: doctor.crmState || 'PB',
        attendanceType: (doctor.attendanceType as any) || 'AMBOS',
        specialties: doctor.doctorSpecialties?.map((ds: any) => ds.specialtyId) || [],
        procedures: doctor.doctorProcedures?.map((dp: any) => dp.procedureId) || [],
        procedureGroups: (doctor as any).doctorProcedureGroups?.map((dpg: any) => dpg.procedureGroupId) || [],
        healthCenter: (doctor as any).user?.healthCenter || null,
      });
      setIsByGroup(((doctor as any).doctorProcedureGroups && (doctor as any).doctorProcedureGroups.length > 0) || false);
    }
  }, [isEditMode, doctor, reset]);

  const activeProcedures = proceduresData?.data?.filter(p => p.isActive) || [];
  const consultationProcedures = activeProcedures.filter(p => p.name.toUpperCase().startsWith('CONSULTA'));
  const examProcedures = activeProcedures.filter(p => !p.name.toUpperCase().startsWith('CONSULTA'));

  const consultationOptions = consultationProcedures.map(p => ({ value: p.id, label: p.name }));
  const examOptions = examProcedures.map(p => ({ value: p.id, label: p.name }));
  const procedureGroupOptions = procedureGroupsData?.map(pg => ({ value: pg.id, label: pg.name })) || [];
  const specialtyOptions = specialtiesData?.data?.filter(s => s.name.toUpperCase().includes('MEDICO') || s.name.toUpperCase().includes('MÉDICO')).map(s => ({ value: s.id, label: s.name })) || [];


  const handleSearchCnes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cnesSearchTerm || cnesSearchTerm.length < 3) {
      toast.error('Digite pelo menos 3 caracteres para buscar.');
      return;
    }

    setIsSearchingCnes(true);
    setHasSearchedAndFailed(false);
    try {
      const isCnes = /^\d+$/.test(cnesSearchTerm);
      const { getEstabelecimentos } = await import('../../services/cnes');
      const res = await getEstabelecimentos({
        nome: !isCnes ? cnesSearchTerm : undefined,
        cnes: isCnes ? cnesSearchTerm : undefined,
      });
      
      if (res.data && res.data.length > 0) {
        setCnesResults(res.data);
      } else {
        setCnesResults([]);
        setHasSearchedAndFailed(true);
        toast.error('Nenhum estabelecimento encontrado. Por favor, insira os dados manualmente.');
      }
    } catch (error) {
      setCnesResults([]);
      setHasSearchedAndFailed(true);
      toast.error('Erro ao buscar. Por favor, insira os dados manualmente.');
    } finally {
      setIsSearchingCnes(false);
    }
  };

  const handleSearchPro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proSearchTerm || proSearchTerm.length < 3) {
      toast.error('Digite pelo menos 3 caracteres para buscar o médico.');
      return;
    }

    const cnesCode = currentValues.healthCenter?.coCnes || currentValues.healthCenter?.cnes;
    if (!cnesCode) {
      toast.error('Unidade de vínculo não possui CNES válido para busca.');
      return;
    }

    setIsSearchingPro(true);
    setHasSearchedProAndFailed(false);
    try {
      const { getProfissionais } = await import('../../services/cnes');
      const res = await getProfissionais({
        nome: proSearchTerm,
        cnes: cnesCode,
        profissao: 'MEDICO'
      });
      
      if (res.data && res.data.length > 0) {
        setProResults(res.data);
      } else {
        setProResults([]);
        setHasSearchedProAndFailed(true);
        toast.error('Nenhum médico encontrado nesta unidade. Preencha os dados manualmente.');
      }
    } catch (error) {
      setProResults([]);
      setHasSearchedProAndFailed(true);
      toast.error('Erro ao buscar médicos. Preencha os dados manualmente.');
    } finally {
      setIsSearchingPro(false);
    }
  };

  const handleNextStep1 = () => {
    if (!currentValues.healthCenter) {
      toast.error('Selecione ou adicione um estabelecimento para continuar.');
      return;
    }
    setStep(2);
  };

  const handleNextStep2 = async () => {
    const isStep2Valid = await trigger(['name', 'cpf', 'cns', 'crm', 'crmState']);
    if (isStep2Valid) {
      setStep(3);
    }
  };

  const handleNextStep3 = async () => {
    const isStep3Valid = await trigger(['specialties', 'attendanceType']);
    if (!isStep3Valid) return;
  
    let hasError = false;
  
    if (currentValues.attendanceType === 'CONSULTA' || currentValues.attendanceType === 'AMBOS') {
      const hasConsultations = currentValues.procedures?.some(id => consultationOptions.some(co => co.value === id));
      if (!hasConsultations) {
        toast.error("Selecione pelo menos uma Consulta Permitida.");
        hasError = true;
      }
    }
  
    if (currentValues.attendanceType === 'EXAME' || currentValues.attendanceType === 'AMBOS') {
      if (isByGroup) {
        if (!currentValues.procedureGroups || currentValues.procedureGroups.length === 0) {
          toast.error("Selecione pelo menos um Grupo de Procedimentos.");
          hasError = true;
        }
      } else {
        const hasExams = currentValues.procedures?.some(id => examOptions.some(eo => eo.value === id));
        if (!hasExams) {
          toast.error("Selecione pelo menos um Exame Permitido.");
          hasError = true;
        }
      }
    }
  
    if (!hasError) {
      setStep(4);
    }
  };

  const onSubmit = (data: FormData) => {
    // Se isByGroup for falso, garantir que procedureGroups seja vazio
    const finalData = {
      ...data,
      procedureGroups: isByGroup ? data.procedureGroups : [],
    };

    if (isEditMode && id) {
      updateMutation.mutate(
        { id, ...finalData },
        {
          onSuccess: () => {
            toast.success('Médico atualizado com sucesso!');
            navigate('/doctors');
          },
          onError: () => toast.error('Erro ao atualizar médico.'),
        }
      );
    } else {
      createMutation.mutate(finalData, {
        onSuccess: () => {
          toast.success('Médico cadastrado com sucesso!');
          navigate('/doctors');
        },
        onError: () => toast.error('Erro ao cadastrar médico.'),
      });
    }
  };

  const isMutating = createMutation.isPending || updateMutation.isPending;

  if (isEditMode && loadingDoctor) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-10 h-10 text-blue-700 animate-spin" />
      </div>
    );
  }

  // Resumo Helpers
  const selectedSpecialties = specialtyOptions.filter(s => currentValues.specialties?.includes(s.value)).map(s => s.label);
  const selectedConsultations = consultationOptions.filter(c => currentValues.procedures?.includes(c.value)).map(c => c.label);
  const selectedExams = examOptions.filter(e => currentValues.procedures?.includes(e.value)).map(e => e.label);
  const selectedGroups = procedureGroupOptions.filter(g => currentValues.procedureGroups?.includes(g.value)).map(g => g.label);

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/doctors')}
            className="flex items-center justify-center w-10 h-10 rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all shadow-md"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {isEditMode ? 'Editar Médico' : 'Novo Médico'}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Etapa {step} de 4
            </p>
          </div>
        </div>
        
        {/* Progress Dots */}
        <div className="flex gap-2">
          <div className={`h-2 w-8 rounded-full transition-colors ${step >= 1 ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`} />
          <div className={`h-2 w-8 rounded-full transition-colors ${step >= 2 ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`} />
          <div className={`h-2 w-8 rounded-full transition-colors ${step >= 3 ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`} />
          <div className={`h-2 w-8 rounded-full transition-colors ${step >= 4 ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`} />
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white shadow-xl shadow-slate-200/50 dark:shadow-none dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden">
        
        {/* Step 1: Unidade de Vínculo */}
        <div className={`p-6 md:p-8 space-y-8 ${step === 1 ? 'block' : 'hidden'}`}>
          <div className="flex items-center gap-3 text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-md">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Vínculo de Estabelecimento</h2>
              <p className="text-sm text-slate-500 font-medium">Selecione a unidade na qual este médico irá atuar.</p>
            </div>
          </div>

          <div className="space-y-6">
            {!currentValues.healthCenter && (
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-md p-6 border border-slate-200 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4">Buscar no CNES</h3>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Ex: POLICLINICA ou 1234567..."
                      value={cnesSearchTerm}
                      onChange={(e) => setCnesSearchTerm(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSearchCnes(e);
                      }}
                      className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSearchCnes}
                    disabled={isSearchingCnes}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md text-sm transition-all shadow-md shadow-blue-500/20 active:scale-95 flex items-center gap-2"
                  >
                    {isSearchingCnes ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                    <span>Buscar</span>
                  </button>
                </div>

                {cnesResults.length > 0 && (
                  <div className="mt-6 space-y-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Resultados ({cnesResults.length})</h4>
                    <div className="max-h-64 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                      {cnesResults.map((est) => (
                        <div
                          key={est.coCnes}
                          onClick={() => reset({ ...currentValues, healthCenter: est })}
                          className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md hover:border-blue-500 hover:shadow-md cursor-pointer transition-all flex justify-between items-center group"
                        >
                          <div>
                            <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {est.noFantasia || est.noRazaoSocial}
                            </h4>
                            <p className="text-sm text-slate-500 mt-1">
                              CNES: <span className="font-semibold">{est.coCnes}</span> • {est.noMunicipio} - {est.sgUf}
                            </p>
                          </div>
                          <div className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                            Vincular
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {hasSearchedAndFailed && cnesResults.length === 0 && (
                  <div className="mt-6 p-5 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-md space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                    <h4 className="text-sm font-bold text-rose-800 dark:text-rose-400">Inserção Manual</h4>
                    <p className="text-xs text-rose-600 dark:text-rose-300">Como a busca não retornou resultados, insira os dados do estabelecimento abaixo.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Nome Fantasia <span className="text-rose-500">*</span></label>
                        <input
                          type="text"
                          value={manualCnesData.noFantasia}
                          onChange={(e) => setManualCnesData({ ...manualCnesData, noFantasia: e.target.value })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md text-sm"
                          placeholder="Ex: POSTO DE SAUDE CENTRAL"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Código CNES <span className="text-rose-500">*</span></label>
                        <input
                          type="text"
                          value={manualCnesData.coCnes}
                          onChange={(e) => setManualCnesData({ ...manualCnesData, coCnes: e.target.value })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md text-sm"
                          placeholder="Ex: 1234567"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Município <span className="text-rose-500">*</span></label>
                        <input
                          type="text"
                          value={manualCnesData.noMunicipio}
                          onChange={(e) => setManualCnesData({ ...manualCnesData, noMunicipio: e.target.value })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md text-sm"
                          placeholder="Ex: JOAO PESSOA"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">UF <span className="text-rose-500">*</span></label>
                        <select
                          value={manualCnesData.sgUf}
                          onChange={(e) => setManualCnesData({ ...manualCnesData, sgUf: e.target.value })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md text-sm"
                        >
                          {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                        </select>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!manualCnesData.noFantasia || !manualCnesData.coCnes || !manualCnesData.noMunicipio) {
                          toast.error('Preencha os campos obrigatórios.');
                          return;
                        }
                        reset({ ...currentValues, healthCenter: manualCnesData });
                      }}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-md text-sm transition-all"
                    >
                      Salvar Manualmente
                    </button>
                  </div>
                )}
              </div>
            )}

            {currentValues.healthCenter && (
              <div className="p-6 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-md flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-400 mb-1">Unidade Selecionada</h3>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">
                    {currentValues.healthCenter.noFantasia || currentValues.healthCenter.name}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    CNES: {currentValues.healthCenter.coCnes || currentValues.healthCenter.cnes} • {currentValues.healthCenter.noMunicipio || 'Manual'} - {currentValues.healthCenter.sgUf || 'Manual'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => reset({ ...currentValues, healthCenter: null })}
                  className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 font-bold rounded-md text-sm transition-all"
                >
                  Trocar Unidade
                </button>
              </div>
            )}
          </div>
          
          <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800 mt-8">
            <button
              type="button"
              onClick={handleNextStep1}
              className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md text-sm transition-all shadow-lg shadow-blue-500/30 active:scale-95"
            >
              <span>Próxima Etapa</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Step 2: Identificação */}
        <div className={`p-6 md:p-8 space-y-8 ${step === 2 ? 'block' : 'hidden'}`}>
          <div className="flex items-center gap-3 text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-md">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Identificação e Documentos</h2>
              <p className="text-sm text-slate-500 font-medium">Os dados de acesso (e-mail e senha) serão gerados com base no CPF.</p>
            </div>
          </div>

          <div className="space-y-6">
            {!isEditMode && (
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-md p-6 border border-slate-200 dark:border-slate-800 mb-6">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4">Autopreencher via CNES (Opcional)</h3>
                <p className="text-xs text-slate-500 mb-4">Busque pelo nome do médico para preencher os dados automaticamente baseados na unidade selecionada.</p>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Nome do Médico..."
                      value={proSearchTerm}
                      onChange={(e) => setProSearchTerm(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSearchPro(e);
                      }}
                      className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSearchPro}
                    disabled={isSearchingPro}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md text-sm transition-all shadow-md shadow-blue-500/20 active:scale-95 flex items-center gap-2"
                  >
                    {isSearchingPro ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                    <span className="hidden sm:inline">Buscar</span>
                  </button>
                </div>

                {proResults.length > 0 && (
                  <div className="mt-6 space-y-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Resultados ({proResults.length})</h4>
                    <div className="max-h-64 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                      {proResults.map((pro, index) => (
                        <div
                          key={pro.cns || index}
                          onClick={() => {
                            let matchedSpecialties: string[] = [];
                            if (pro.unidades && pro.unidades.length > 0 && specialtiesData?.data) {
                              const selectedCnes = currentValues.healthCenter?.coCnes || currentValues.healthCenter?.cnes;
                              const unitCbos = pro.unidades
                                .filter((u: any) => u.codigo === selectedCnes && u.cbo)
                                .map((u: any) => u.cbo);

                              matchedSpecialties = unitCbos.map((c: any) => {
                                const match = specialtiesData.data.find(s => s.cbo === c.codigo || s.name.toUpperCase() === c.nome.toUpperCase());
                                return match?.id;
                              }).filter(Boolean) as string[];
                            }

                            reset({ 
                              ...currentValues, 
                              name: pro.nome,
                              cns: formatCNS(pro.cns || ''),
                              cpf: pro.cpf_mascarado || '',
                              specialties: matchedSpecialties.length > 0 ? matchedSpecialties : currentValues.specialties,
                            });
                            setIsCnsDisabled(true);
                            setProResults([]);
                            toast.success('Dados preenchidos! Por favor, substitua os X pelo CPF real e complete o CRM.');
                          }}
                          className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md hover:border-blue-500 hover:shadow-md cursor-pointer transition-all flex justify-between items-center group"
                        >
                          <div>
                            <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {pro.nome}
                            </h4>
                            <p className="text-sm text-slate-500 mt-1">
                              CNS: <span className="font-semibold">{formatCNS(pro.cns || '')}</span>
                            </p>
                            {pro.cbos && pro.cbos.length > 0 && (
                              <p className="text-xs text-slate-400 mt-1 truncate max-w-[250px] sm:max-w-md">
                                {pro.cbos.map((c: any) => c.nome).join(', ')}
                              </p>
                            )}
                          </div>
                          <div className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            Preencher
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {hasSearchedProAndFailed && proResults.length === 0 && (
                  <div className="mt-6 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-md">
                    <p className="text-sm font-bold text-rose-800 dark:text-rose-400">Nenhum médico encontrado.</p>
                    <p className="text-xs text-rose-600 dark:text-rose-300 mt-1">Por favor, preencha os dados abaixo manualmente.</p>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                Nome Completo do Médico <span className="text-rose-500">*</span>
              </label>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    placeholder="Ex: João Silva"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                )}
              />
              {errors.name && <p className="text-rose-500 text-xs font-semibold">{errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">CRM <span className="text-rose-500">*</span></label>
                <Controller
                  name="crm"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      placeholder="Ex: 123456"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  )}
                />
                {errors.crm && <p className="text-rose-500 text-xs font-semibold">{errors.crm.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">UF do CRM <span className="text-rose-500">*</span></label>
                <Controller
                  name="crmState"
                  control={control}
                  render={({ field }) => (
                    <select
                      {...field}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                    >
                      <option value="" disabled>Selecione a UF</option>
                      {UFS.map(uf => (
                        <option key={uf} value={uf}>{uf}</option>
                      ))}
                    </select>
                  )}
                />
                {errors.crmState && <p className="text-rose-500 text-xs font-semibold">{errors.crmState.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">CPF <span className="text-rose-500">*</span></label>
                <Controller
                  name="cpf"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      onChange={e => field.onChange(formatCPF(e.target.value))}
                      placeholder="000.000.000-00"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  )}
                />
                {errors.cpf && <p className="text-rose-500 text-xs font-semibold">{errors.cpf.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">CNS</label>
                <Controller
                  name="cns"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      disabled={isCnsDisabled}
                      onChange={e => field.onChange(formatCNS(e.target.value))}
                      placeholder="000 0000 0000 0000"
                      className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${isCnsDisabled ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-900' : ''}`}
                    />
                  )}
                />
                {errors.cns && <p className="text-rose-500 text-xs font-semibold">{errors.cns.message}</p>}
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 mt-8">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center gap-2 px-6 py-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold rounded-md text-sm transition-all active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>
            <button
              type="button"
              onClick={handleNextStep2}
              className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md text-sm transition-all shadow-lg shadow-blue-500/30 active:scale-95"
            >
              <span>Próxima Etapa</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Step 3: Atuação */}
        <div className={`p-6 md:p-8 space-y-8 ${step === 3 ? 'block' : 'hidden'}`}>
          <div className="flex items-center gap-3 text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-md">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Atuação Profissional</h2>
              <p className="text-sm text-slate-500 font-medium">Defina as especialidades e procedimentos</p>
            </div>
          </div>

          <div className="space-y-8">
            {/* Especialidades */}
            <div className="space-y-3">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                Especialidades <span className="text-rose-500">*</span>
              </label>
              <Controller
                name="specialties"
                control={control}
                render={({ field }) => (
                  <Select
                    isMulti
                    unstyled
                    options={specialtyOptions}
                    value={specialtyOptions.filter(opt => field.value?.includes(opt.value))}
                    onChange={(selected) => field.onChange(selected ? selected.map(s => s.value) : [])}
                    placeholder="Selecione as especialidades..."
                    noOptionsMessage={() => "Nenhuma especialidade encontrada"}
                    classNames={customSelectStyles}
                    isLoading={loadingSpecialties}
                  />
                )}
              />
              {errors.specialties && <p className="text-rose-500 text-xs font-semibold">{errors.specialties.message}</p>}
            </div>

            {/* Tipo de Atendimento */}
            <div className="space-y-3">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                Tipo de Atendimento <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {['CONSULTA', 'EXAME', 'AMBOS'].map((type) => (
                  <label 
                    key={type} 
                    className={`flex items-center justify-center p-4 rounded-md border-2 cursor-pointer transition-all ${attendanceType === type ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400'}`}
                  >
                    <Controller
                      name="attendanceType"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="radio"
                          className="sr-only"
                          value={type}
                          checked={field.value === type}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      )}
                    />
                    <span className="font-bold tracking-wide capitalize">{type.toLowerCase()}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Consultas */}
            {(attendanceType === 'CONSULTA' || attendanceType === 'AMBOS') && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-300">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                  Consultas Permitidas <span className="text-rose-500">*</span>
                </label>
                <Controller
                  name="procedures"
                  control={control}
                  render={({ field }) => (
                    <Select
                      isMulti
                      unstyled
                      options={consultationOptions}
                      value={consultationOptions.filter(opt => field.value?.includes(opt.value))}
                      onChange={(selected) => {
                        const exams = field.value?.filter(id => examOptions.some(eo => eo.value === id)) || [];
                        const newConsultations = selected ? selected.map(s => s.value) : [];
                        field.onChange([...exams, ...newConsultations]);
                      }}
                      placeholder="Selecione as consultas permitidas..."
                      noOptionsMessage={() => "Nenhuma consulta encontrada"}
                      classNames={customSelectStyles}
                      isLoading={loadingProcedures}
                    />
                  )}
                />
              </div>
            )}

            {/* Renderizar Procedimentos condicionalmente se EXAME ou AMBOS */}
            {(attendanceType === 'EXAME' || attendanceType === 'AMBOS') && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                    Procedimentos Permitidos (Exames) <span className="text-rose-500">*</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 bg-white dark:bg-slate-950" 
                      checked={isByGroup}
                      onChange={(e) => {
                        setIsByGroup(e.target.checked);
                      }}
                    />
                    Vincular exames por Grupo?
                  </label>
                </div>
                
                {isByGroup ? (
                  <Controller
                    name="procedureGroups"
                    control={control}
                    render={({ field }) => (
                      <Select
                        isMulti
                        unstyled
                        options={procedureGroupOptions}
                        value={procedureGroupOptions.filter(opt => field.value?.includes(opt.value))}
                        onChange={(selected) => field.onChange(selected ? selected.map(s => s.value) : [])}
                        placeholder="Selecione os grupos de procedimentos..."
                        noOptionsMessage={() => "Nenhum grupo encontrado"}
                        classNames={customSelectStyles}
                        isLoading={loadingProcedureGroups}
                      />
                    )}
                  />
                ) : (
                  <Controller
                    name="procedures"
                    control={control}
                    render={({ field }) => (
                      <Select
                        isMulti
                        unstyled
                        options={examOptions}
                        value={examOptions.filter(opt => field.value?.includes(opt.value))}
                        onChange={(selected) => {
                          const consultations = field.value?.filter(id => consultationOptions.some(co => co.value === id)) || [];
                          const newExams = selected ? selected.map(s => s.value) : [];
                          field.onChange([...consultations, ...newExams]);
                        }}
                        placeholder="Selecione os exames que o médico realiza..."
                        noOptionsMessage={() => "Nenhum exame encontrado"}
                        classNames={customSelectStyles}
                        isLoading={loadingProcedures}
                      />
                    )}
                  />
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 mt-8">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex items-center gap-2 px-6 py-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold rounded-md text-sm transition-all active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>
            <button
              type="button"
              onClick={handleNextStep3}
              className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md text-sm transition-all shadow-lg shadow-blue-500/30 active:scale-95"
            >
              <span>Ver Resumo</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Step 4: Resumo */}
        <div className={`p-6 md:p-8 space-y-8 ${step === 4 ? 'block' : 'hidden'}`}>
          <div className="flex items-center gap-3 text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-md">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Resumo do Cadastro</h2>
              <p className="text-sm text-slate-500 font-medium">Confirme os dados antes de finalizar</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-md p-6 space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-500" />
                  Identificação
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="block text-slate-500 dark:text-slate-400">Nome do Médico</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{currentValues.name || '-'}</span>
                  </div>
                  <div>
                    <span className="block text-slate-500 dark:text-slate-400">CRM / UF</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{currentValues.crm} - {currentValues.crmState}</span>
                  </div>
                  <div>
                    <span className="block text-slate-500 dark:text-slate-400">CPF</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{currentValues.cpf || '-'}</span>
                  </div>
                  <div>
                    <span className="block text-slate-500 dark:text-slate-400">CNS</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{currentValues.cns || '-'}</span>
                  </div>
                </div>
              </div>

              <div className="w-full h-px bg-slate-200 dark:bg-slate-700/50" />

              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-blue-500" />
                  Atuação Profissional
                </h3>
                <div className="space-y-4 text-sm">
                  <div>
                    <span className="block text-slate-500 dark:text-slate-400 mb-1">Tipo de Atendimento</span>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 font-semibold text-xs capitalize">
                      {currentValues.attendanceType?.toLowerCase()}
                    </span>
                  </div>
                  
                  <div>
                    <span className="block text-slate-500 dark:text-slate-400 mb-1">Especialidades ({selectedSpecialties.length})</span>
                    <div className="flex flex-wrap gap-2">
                      {selectedSpecialties.length > 0 ? selectedSpecialties.map(spec => (
                        <span key={spec} className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md text-xs font-semibold">
                          {spec}
                        </span>
                      )) : <span className="text-slate-400">-</span>}
                    </div>
                  </div>

                  {(currentValues.attendanceType === 'CONSULTA' || currentValues.attendanceType === 'AMBOS') && (
                    <div>
                      <span className="block text-slate-500 dark:text-slate-400 mb-1">Consultas ({selectedConsultations.length})</span>
                      <div className="flex flex-wrap gap-2">
                        {selectedConsultations.length > 0 ? selectedConsultations.map(c => (
                          <span key={c} className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md text-xs font-semibold">
                            {c}
                          </span>
                        )) : <span className="text-slate-400">-</span>}
                      </div>
                    </div>
                  )}

                  {(currentValues.attendanceType === 'EXAME' || currentValues.attendanceType === 'AMBOS') && (
                    <div>
                      <span className="block text-slate-500 dark:text-slate-400 mb-1">
                        Exames {isByGroup ? `(Por Grupos: ${selectedGroups.length})` : `(Avulsos: ${selectedExams.length})`}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {isByGroup ? (
                          selectedGroups.length > 0 ? selectedGroups.map(g => (
                            <span key={g} className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md text-xs font-semibold">
                              {g}
                            </span>
                          )) : <span className="text-slate-400">-</span>
                        ) : (
                          selectedExams.length > 0 ? selectedExams.map(e => (
                            <span key={e} className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md text-xs font-semibold">
                              {e}
                            </span>
                          )) : <span className="text-slate-400">-</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 mt-8">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="flex items-center gap-2 px-6 py-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold rounded-md text-sm transition-all active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>
            <button
              type="submit"
              disabled={isMutating}
              className="flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-md text-sm transition-all shadow-lg shadow-emerald-500/30 active:scale-95 disabled:opacity-55 disabled:cursor-not-allowed"
            >
              {isMutating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  <span>{isEditMode ? 'Salvar Alterações' : 'Concluir Cadastro'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePatient, useUpdatePatientAttention } from '../../hooks/usePatients';
import { useMedicalRecords } from '../../hooks/useMedicalRecords';
import { usePermission } from '../../hooks/usePermission';
import { toast } from 'sonner';
import {
    ArrowLeft,
    User,
    Building,
    UserCheck,
    Phone,
    MessageSquare,
    ShieldAlert,
    ExternalLink,
    Activity,
    AlertTriangle,
    Stethoscope,
    FileText,
    Pill,
    Calendar,
    Edit
} from 'lucide-react';

const formatCPF = (cpf?: string) => {
    if (!cpf) return '-';
    const clean = cpf.replace(/\D/g, '');
    if (clean.length !== 11) return cpf;
    return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`;
};

const formatDateOnly = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
        return new Date(dateStr).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    } catch {
        return dateStr;
    }
};

const formatDateWithTime = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
        return new Date(dateStr).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return dateStr;
    }
};

const calculateAge = (birthDateStr?: string) => {
    if (!birthDateStr) return '-';
    try {
        const birthDate = new Date(birthDateStr);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return `${age} anos`;
    } catch {
        return '-';
    }
};

export const PatientDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const { data: patient, isLoading, error, refetch } = usePatient(id || '');
    const { data: recordsData, isLoading: isLoadingRecords } = useMedicalRecords(id || '');
    const medicalRecords = recordsData?.data || [];
    const updatePatientAttentionMutation = useUpdatePatientAttention();
    const { hasPermission } = usePermission();
    const canEditAttention = hasPermission('patients:write_attention');

    // State for attention level edit modal
    const [showAttentionModal, setShowAttentionModal] = useState(false);
    const [attentionLevel, setAttentionLevel] = useState<number>(1);
    const [attentionNotes, setAttentionNotes] = useState<string>('');

    const openAttentionModal = () => {
        if (!canEditAttention) return;
        setAttentionLevel(patient?.attentionLevel || 1);
        setAttentionNotes(patient?.attentionNotes || '');
        setShowAttentionModal(true);
    };

    const handleSaveAttention = (e: React.FormEvent) => {
        e.preventDefault();
        if (!patient?.id) return;
        updatePatientAttentionMutation.mutate({
            id: patient.id,
            attentionLevel,
            attentionNotes: attentionNotes || '',
        }, {
            onSuccess: () => {
                toast.success('Alerta de atenção do paciente atualizado com sucesso!');
                setShowAttentionModal(false);
                refetch();
            },
            onError: () => {
                toast.error('Ocorreu um erro ao atualizar o alerta do paciente.');
            }
        });
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">Carregando detalhes do paciente...</span>
            </div>
        );
    }

    if (error || !patient) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
                <AlertTriangle className="w-12 h-12 text-rose-700 dark:text-rose-500" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Paciente não encontrado</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                    Não foi possível carregar os detalhes do paciente. Certifique-se de que o ID é válido.
                </p>
                <button
                    onClick={() => navigate('/patients')}
                    className="mt-2 px-4 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:text-slate-900 rounded-md text-sm cursor-pointer shadow-md"
                >
                    Voltar para a Lista
                </button>
            </div>
        );
    }



    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white shadow-md dark:bg-slate-900/30 border border-slate-900 rounded-md p-6 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/patients')}
                        className="flex items-center justify-center w-10 h-10 rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 transition-all cursor-pointer shadow-md"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-bold text-slate-900 dark:text-white">{patient.name}</h1>

                            {/* Indicador de nível de atenção */}
                            <div className="relative group flex items-center">
                                <button
                                    type="button"
                                    disabled={!canEditAttention}
                                    onClick={openAttentionModal}
                                    className={`p-1 rounded-md transition-all duration-200 ${canEditAttention
                                            ? 'hover:bg-slate-200 dark:bg-slate-800 cursor-pointer'
                                            : 'cursor-default'
                                        } ${patient.attentionLevel === 3
                                            ? 'text-amber-700 dark:text-amber-500 hover:text-amber-400'
                                            : patient.attentionLevel === 4
                                                ? 'text-orange-700 dark:text-orange-500 hover:text-orange-400'
                                                : patient.attentionLevel === 5
                                                    ? 'text-rose-700 dark:text-rose-500 hover:text-rose-400'
                                                    : 'text-slate-600 hover:text-slate-500'
                                        }`}
                                >
                                    <ShieldAlert className="w-5 h-5 shrink-0" />
                                </button>

                                {/* Tooltip */}
                                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden group-hover:block bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs rounded-md p-3 shadow-xl w-64 z-50">
                                    <div className="font-bold text-slate-900 dark:text-white mb-1 flex justify-between items-center">
                                        <span>Nível de Atenção: {patient.attentionLevel || 1}/5</span>
                                        {canEditAttention && (
                                            <span className="text-slate-500 font-normal text-[10px]">(Clique p/ editar)</span>
                                        )}
                                    </div>
                                    <div className="text-slate-500 dark:text-slate-400 break-words font-normal whitespace-pre-wrap">
                                        {patient.attentionNotes || 'Nenhuma observação interna cadastrada.'}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 mt-1 font-mono text-xs">ID Paciente: {patient.id}</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <button
                        type="button"
                        onClick={() => navigate(`/medical-records/${patient.id}`)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/40 text-teal-700 dark:text-teal-300 font-semibold border border-teal-200 dark:border-teal-800 rounded-md text-sm transition-all cursor-pointer shadow-md active:scale-95"
                    >
                        <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                        <span>Ver Prontuário Completo</span>
                    </button>

                    <button
                        onClick={() => navigate(`/patients/${patient.id}/edit`)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 hover:border-slate-300 text-slate-600 dark:text-slate-300 font-medium rounded-md text-sm transition-all cursor-pointer shadow-md active:scale-95"
                    >
                        <Edit className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        <span>Editar Paciente</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left column: demographic and contact data */}
                <div className="space-y-6 lg:col-span-2">

                    {/* Cadastral & Demographic Card */}
                    <div className="bg-white shadow-md dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-md p-6 backdrop-blur-md space-y-4">
                        <h2 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-300 dark:border-slate-800/60 pb-3 flex items-center gap-2">
                            <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span>Dados Cadastrais</span>
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <span className="text-xs text-slate-500 uppercase block tracking-wider">Nome Completo</span>
                                <span className="text-slate-700 dark:text-slate-200 font-semibold text-sm">{patient.name}</span>
                            </div>

                            <div>
                                <span className="text-xs text-slate-500 uppercase block tracking-wider">CPF</span>
                                <span className="text-slate-700 dark:text-slate-200 font-mono text-sm">{formatCPF(patient.cpf)}</span>
                            </div>

                            <div>
                                <span className="text-xs text-slate-500 uppercase block tracking-wider">CNS (Cartão SUS)</span>
                                <span className="text-slate-700 dark:text-slate-200 font-mono text-sm">{patient.cns || 'Não informado'}</span>
                            </div>

                            <div>
                                <span className="text-xs text-slate-500 uppercase block tracking-wider">Data de Nascimento / Idade</span>
                                <span className="text-slate-700 dark:text-slate-200 text-sm">
                                    {formatDateOnly(patient.birthDate)} ({calculateAge(patient.birthDate)})
                                </span>
                            </div>

                            <div>
                                <span className="text-xs text-slate-500 uppercase block tracking-wider">Gênero</span>
                                <span className="text-slate-700 dark:text-slate-200 text-sm capitalize">{patient.gender}</span>
                            </div>

                            <div>
                                <span className="text-xs text-slate-500 uppercase block tracking-wider">Cadastrado em</span>
                                <span className="text-slate-700 dark:text-slate-200 text-sm">{formatDateOnly(patient.createdAt)}</span>
                            </div>

                            <div className="md:col-span-2 border-t border-slate-300 dark:border-slate-800/40 pt-3 mt-1">
                                <span className="text-xs text-slate-500 uppercase block tracking-wider">Endereço Residencial</span>
                                <span className="text-slate-700 dark:text-slate-200 text-sm font-medium break-words block mt-0.5">
                                    {patient.address || 'Não informado'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Anamnese / Condições Clínicas Card */}
                    <div className="bg-white shadow-md dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-md p-6 backdrop-blur-md space-y-4">
                        <h2 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-300 dark:border-slate-800/60 pb-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Activity className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                <span>Perfil Clínico (Anamnese)</span>
                            </div>
                        </h2>
                        
                        {!patient.patientAnamnesis ? (
                            <div className="text-sm text-slate-500 italic py-2">
                                Nenhum dado clínico registrado. Será atualizado no próximo atendimento.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-md border border-slate-200 dark:border-slate-700">
                                    <span className="text-xs text-slate-500 uppercase block tracking-wider mb-1">Hipertenso</span>
                                    <span className={`text-sm font-semibold ${patient.patientAnamnesis.isHypertensive ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                        {patient.patientAnamnesis.isHypertensive ? 'Sim' : 'Não'}
                                    </span>
                                </div>
                                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-md border border-slate-200 dark:border-slate-700">
                                    <span className="text-xs text-slate-500 uppercase block tracking-wider mb-1">Diabético</span>
                                    <span className={`text-sm font-semibold ${patient.patientAnamnesis.isDiabetic ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                        {patient.patientAnamnesis.isDiabetic ? 'Sim' : 'Não'}
                                    </span>
                                </div>
                                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-md border border-slate-200 dark:border-slate-700">
                                    <span className="text-xs text-slate-500 uppercase block tracking-wider mb-1">Fumante</span>
                                    <span className={`text-sm font-semibold ${patient.patientAnamnesis.isSmoker ? 'text-orange-600 dark:text-orange-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                        {patient.patientAnamnesis.isSmoker ? 'Sim' : 'Não'}
                                    </span>
                                </div>
                                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-md border border-slate-200 dark:border-slate-700">
                                    <span className="text-xs text-slate-500 uppercase block tracking-wider mb-1">Paciente Oncológico</span>
                                    <span className={`text-sm font-semibold ${patient.patientAnamnesis.isOncological ? 'text-purple-600 dark:text-purple-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                        {patient.patientAnamnesis.isOncological ? `Sim (${patient.patientAnamnesis.oncologicalStage})` : 'Não'}
                                    </span>
                                </div>
                                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-md border border-slate-200 dark:border-slate-700">
                                    <span className="text-xs text-slate-500 uppercase block tracking-wider mb-1">PcD</span>
                                    <span className={`text-sm font-semibold ${patient.patientAnamnesis.isPcd ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                        {patient.patientAnamnesis.isPcd ? `Sim (${patient.patientAnamnesis.pcdDescription})` : 'Não'}
                                    </span>
                                </div>
                                <div className="md:col-span-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-md border border-slate-200 dark:border-slate-700">
                                    <span className="text-xs text-slate-500 uppercase block tracking-wider mb-1">Alergias</span>
                                    <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                                        {patient.patientAnamnesis.allergies || 'Nenhuma informada'}
                                    </span>
                                </div>
                                <div className="md:col-span-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-md border border-slate-200 dark:border-slate-700">
                                    <span className="text-xs text-slate-500 uppercase block tracking-wider mb-1">Outras Doenças</span>
                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                        {patient.patientAnamnesis.otherDiseases || 'Nenhuma informada'}
                                    </span>
                                </div>
                                <div className="md:col-span-2 lg:col-span-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-md border border-slate-200 dark:border-slate-700">
                                    <span className="text-xs text-slate-500 uppercase block tracking-wider mb-1">Medicações de Uso Contínuo</span>
                                    {patient.patientAnamnesis.continuousMedications?.length > 0 ? (
                                        <ul className="list-disc pl-5 mt-1 space-y-0.5">
                                            {patient.patientAnamnesis.continuousMedications.map((med: string, i: number) => (
                                                <li key={i} className="text-sm text-slate-700 dark:text-slate-300 font-medium">{med}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <span className="text-sm text-slate-500 italic">Nenhuma informada</span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Medical Records History Card */}
                    <div className="bg-white shadow-md dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-md p-6 backdrop-blur-md space-y-4">
                        <div className="flex items-center gap-2.5 border-b border-slate-300 dark:border-slate-800/60 pb-3">
                            <Stethoscope className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                            <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                Histórico de Atendimentos Clínicos (Prontuário)
                            </h2>
                            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                                {medicalRecords.length}
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left">
                                <thead>
                                    <tr className="border-b border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950/20 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                                        <th className="px-4 py-3">Data / Horário</th>
                                        <th className="px-4 py-3">Profissional / Especialidade</th>
                                        <th className="px-4 py-3">CID-10</th>
                                        <th className="px-4 py-3">Queixa / Resumo Clínico</th>
                                        <th className="px-4 py-3">Prescrições / Exames</th>
                                        <th className="px-4 py-3 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-sm">
                                    {isLoadingRecords ? (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                                                <div className="flex items-center justify-center gap-2">
                                                    <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                                                    <span>Carregando atendimentos...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : medicalRecords.length > 0 ? (
                                        medicalRecords.map((record) => {
                                            const docInfo = record.doctor?.doctors?.[0];
                                            const specialtyName = docInfo?.doctorSpecialties?.[0]?.specialty?.name;
                                            const crmFormatted = docInfo?.crm ? `CRM ${docInfo.crm}${docInfo.crmState ? '/' + docInfo.crmState : ''}` : null;
                                            const hasMedications = record.medications && record.medications.length > 0;
                                            const hasExams = record.requestedExams && record.requestedExams.length > 0;

                                            return (
                                                <tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <div className="font-medium text-slate-900 dark:text-white flex items-center gap-1.5">
                                                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                            <span>{formatDateWithTime(record.recordDate || (record as any).createdAt)}</span>
                                                        </div>
                                                        {record.isActive === false && (
                                                            <span className="inline-block mt-1 text-xxs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded px-1.5 py-0.5">
                                                                Cancelado / Inativo
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="font-medium text-slate-900 dark:text-white">
                                                            {record.doctor?.name || 'Profissional não identificado'}
                                                        </div>
                                                        <div className="text-xxs text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                                                            {specialtyName && (
                                                                <span className="text-teal-600 dark:text-teal-400 font-medium">
                                                                    {specialtyName}
                                                                </span>
                                                            )}
                                                            {specialtyName && crmFormatted && <span>•</span>}
                                                            {crmFormatted && (
                                                                <span>{crmFormatted}</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        {record.cid10 ? (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                                                CID: {record.cid10}
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-slate-400 italic">Não informado</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div
                                                            className="text-xs text-slate-700 dark:text-slate-300 max-w-xs line-clamp-2"
                                                            title={record.observation}
                                                        >
                                                            {record.observation || <span className="italic text-slate-400">Sem queixa/observação registrada</span>}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                            {hasMedications && (
                                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xxs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                                                    <Pill className="w-2.5 h-2.5" />
                                                                    <span>{record.medications.length} med.</span>
                                                                </span>
                                                            )}
                                                            {hasExams && (
                                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xxs font-medium bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                                                    <Activity className="w-2.5 h-2.5" />
                                                                    <span>{record.requestedExams.length} exame(s)</span>
                                                                </span>
                                                            )}
                                                            {record.attachments && record.attachments.length > 0 && (
                                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xxs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                                                    <span>{record.attachments.length} anexo(s)</span>
                                                                </span>
                                                            )}
                                                            {!hasMedications && !hasExams && (!record.attachments || record.attachments.length === 0) && (
                                                                <span className="text-xs text-slate-400">-</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-right whitespace-nowrap">
                                                        <button
                                                            onClick={() => navigate(`/medical-records/${patient.id}`)}
                                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 bg-teal-500/5 hover:bg-teal-500/10 border border-teal-500/10 hover:border-teal-200 dark:border-teal-500/20 rounded-md transition-all cursor-pointer shadow-sm"
                                                            title="Ver detalhes no prontuário"
                                                        >
                                                            <ExternalLink className="w-3.5 h-3.5" />
                                                            <span>Ver Prontuário</span>
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-8 text-center text-slate-500 italic">
                                                Nenhum atendimento clínico registrado no prontuário deste paciente até o momento.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right column: contacts, UBS and ACS information */}
                <div className="space-y-6">

                    {/* Contact info card */}
                    <div className="bg-white shadow-md dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-md p-6 backdrop-blur-md space-y-4">
                        <h2 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-300 dark:border-slate-800/60 pb-3 flex items-center gap-2">
                            <Phone className="w-4 h-4 text-emerald-450 animate-pulse" />
                            <span>Canais de Contato</span>
                        </h2>

                        <div className="space-y-3">
                            {patient.phones && patient.phones.length > 0 ? (
                                patient.phones.map((phone) => (
                                    <div
                                        key={phone.id}
                                        className="flex justify-between items-center bg-white dark:bg-slate-950/40 border border-slate-300 dark:border-slate-800/60 rounded-md p-3.5"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            {phone.isWhatsapp ? (
                                                <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                            ) : (
                                                <Phone className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                                            )}
                                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 font-mono">{phone.phoneNumber}</span>
                                        </div>
                                        {phone.isWhatsapp && (
                                            <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-md">
                                                WhatsApp
                                            </span>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="text-slate-500 italic text-sm text-center py-4">Sem telefones de contato.</div>
                            )}
                        </div>
                    </div>

                    {/* Health Center & ACS Link card */}
                    <div className="bg-white shadow-md dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-md p-6 backdrop-blur-md space-y-5">
                        <h2 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-300 dark:border-slate-800/60 pb-3 flex items-center gap-2">
                            <Building className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            <span>Vínculo Territorial (UBS/ACS)</span>
                        </h2>

                        <div className="space-y-4">
                            <div className="flex items-start gap-3 bg-white dark:bg-slate-950/20 border border-slate-200 dark:border-slate-850 p-4 rounded-md">
                                <Building className="w-5 h-5 text-indigo-700 dark:text-indigo-500 mt-0.5 shrink-0" />
                                <div className="space-y-1 flex-1 min-w-0">
                                    <span className="text-[10px] text-slate-500 uppercase block tracking-wider">Unidade de Saúde (UBS)</span>
                                    <span className="text-slate-700 dark:text-slate-200 text-sm font-semibold block">{patient.healthCenter?.name}</span>
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        {patient.healthCenter?.cnes && (
                                            <span className="text-xxs font-mono bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md">
                                                CNES: {patient.healthCenter.cnes}
                                            </span>
                                        )}
                                        {patient.healthCenter?.nurseName && (
                                            <span className="text-xxs font-mono bg-indigo-100 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-md">
                                                Enfª: {patient.healthCenter.nurseName}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {patient.healthAgent && (
                                <div className="flex items-start gap-3 bg-white dark:bg-slate-950/20 border border-slate-200 dark:border-slate-850 p-4 rounded-md">
                                    <UserCheck className="w-5 h-5 text-indigo-700 dark:text-indigo-500 mt-0.5 shrink-0" />
                                    <div className="space-y-1.5 flex-1 min-w-0">
                                        <span className="text-[10px] text-slate-500 uppercase block tracking-wider">Agente Comunitário (ACS)</span>
                                        <span className="text-slate-700 dark:text-slate-200 text-sm font-semibold block truncate" title={patient.healthAgent.name}>
                                            {patient.healthAgent.name}
                                        </span>
                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                            {patient.healthAgent.microArea && (
                                                <span className="text-xxs font-mono bg-indigo-100 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-md">
                                                    M.Área: {patient.healthAgent.microArea}
                                                </span>
                                            )}
                                            {patient.healthAgent.phone && (
                                                <span className="text-xxs bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md font-mono">
                                                    Tel: {patient.healthAgent.phone}
                                                </span>
                                            )}
                                            {!patient.healthAgent.microArea && !patient.healthAgent.phone && (
                                                <span className="text-xxs text-slate-500 italic">Sem contato ou microárea</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal de Edição de Nível de Atenção */}
            {showAttentionModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-300 dark:border-slate-800">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <ShieldAlert className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                <span>Nível de Atenção do Paciente</span>
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowAttentionModal(false)}
                                className="text-slate-500 hover:text-slate-900 dark:text-white cursor-pointer text-xl"
                            >
                                &times;
                            </button>
                        </div>

                        <form onSubmit={handleSaveAttention} className="space-y-4">
                            <div className="space-y-2">
                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    Ranking de Dificuldade / Alerta
                                </label>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map((lvl) => (
                                        <button
                                            key={lvl}
                                            type="button"
                                            onClick={() => setAttentionLevel(lvl)}
                                            className={`flex-1 py-2 px-3 rounded-md border text-sm font-semibold transition-all cursor-pointer ${attentionLevel === lvl
                                                    ? lvl === 1 || lvl === 2
                                                        ? 'bg-slate-200 dark:bg-slate-800 border-slate-650 text-slate-900 dark:text-white'
                                                        : lvl === 3
                                                            ? 'bg-amber-500/20 border-amber-500 text-amber-600 dark:text-amber-400 shadow-md '
                                                            : lvl === 4
                                                                ? 'bg-orange-500/20 border-orange-500 text-orange-600 dark:text-orange-400 shadow-md '
                                                                : 'bg-rose-500/20 border-rose-500 text-rose-600 dark:text-rose-400 shadow-md '
                                                    : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-850 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:border-slate-800'
                                                }`}
                                        >
                                            {lvl}
                                        </button>
                                    ))}
                                </div>
                                <div className="text-[10px] text-slate-500 mt-1">
                                    {attentionLevel === 1 && 'Nível 1: Baixo / Padrão'}
                                    {attentionLevel === 2 && 'Nível 2: Leve'}
                                    {attentionLevel === 3 && 'Nível 3: Moderado'}
                                    {attentionLevel === 4 && 'Nível 4: Alto'}
                                    {attentionLevel === 5 && 'Nível 5: Crítico'}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    Notas Internas
                                </label>
                                <textarea
                                    value={attentionNotes}
                                    onChange={(e) => setAttentionNotes(e.target.value)}
                                    placeholder="Justifique o nível de atenção ou adicione observações para os reguladores..."
                                    rows={4}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-md text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 resize-none font-normal"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowAttentionModal(false)}
                                    className="px-4 py-2 border border-slate-300 hover:border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 rounded-md text-sm transition-all cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={updatePatientAttentionMutation.isPending}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium rounded-md text-sm transition-all cursor-pointer shadow-md"
                                >
                                    {updatePatientAttentionMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

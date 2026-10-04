import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePatient, useUpdatePatientAttention } from '../../hooks/usePatients';
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
    AlertTriangle
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
                    className="mt-2 px-4 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:text-white rounded-md text-sm cursor-pointer shadow-md"
                >
                    Voltar para a Lista
                </button>
            </div>
        );
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDING_REGULATION':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xxs font-semibold bg-amber-100 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400">
                        Aguardando Regulação
                    </span>
                );
            case 'SCHEDULED':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xxs font-semibold bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                        Agendado
                    </span>
                );
            case 'PENDING_SYSTEM':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xxs font-semibold bg-blue-100 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400">
                        Pendente no Sistema
                    </span>
                );
            case 'RETURNED':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xxs font-semibold bg-rose-100 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400">
                        Devolvido
                    </span>
                );
            case 'ARCHIVED':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xxs font-semibold bg-slate-500/10 border border-slate-300 dark:border-slate-700/30 text-slate-500 dark:text-slate-400">
                        Arquivado
                    </span>
                );
            default:
                return (
                    <span className="px-2.5 py-0.5 rounded-full text-xxs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {status}
                    </span>
                );
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white shadow-md dark:bg-slate-900/30 border border-slate-900 rounded-md p-6 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/patients')}
                        className="flex items-center justify-center w-10 h-10 rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-all cursor-pointer shadow-md"
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
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-mono text-xs">ID Paciente: {patient.id}</p>
                    </div>
                </div>

                <button
                    onClick={() => navigate(`/patients/${patient.id}/edit`)}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 hover:border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium rounded-md text-sm transition-all cursor-pointer shadow-md active:scale-95"
                >
                    Editar Paciente
                </button>
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

                    {/* Requests History Card */}
                    <div className="bg-white shadow-md dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-md p-6 backdrop-blur-md space-y-4">
                        <h2 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-300 dark:border-slate-800/60 pb-3 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                            <span>Histórico de Regulação (Solicitações)</span>
                        </h2>

                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left">
                                <thead>
                                    <tr className="border-b border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950/20 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                                        <th className="px-4 py-3">Procedimento</th>
                                        <th className="px-4 py-3">Prioridade</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Solicitado em</th>
                                        <th className="px-4 py-3 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-sm">
                                    {patient.requests && patient.requests.length > 0 ? (
                                        patient.requests.map((req) => (
                                            <tr key={req.id} className="hover:bg-slate-200 dark:bg-slate-800/10 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-slate-900 dark:text-white max-w-xs truncate">
                                                        {req.procedures && req.procedures.length > 0
                                                            ? req.procedures.map((p) => p.procedure.name).join(', ')
                                                            : 'Sem procedimento'}
                                                    </div>
                                                    <div className="text-xxs text-slate-500 mt-0.5">
                                                        Protocolo: #{String(req.code).padStart(5, '0')}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-1.5">
                                                        <div
                                                            className={`w-2.5 h-2.5 rounded-full shrink-0 ${req.priority === 'P1'
                                                                    ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                                                                    : req.priority === 'P2'
                                                                        ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                                                                        : 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]'
                                                                }`}
                                                        />
                                                        <span className="text-xs text-slate-600 dark:text-slate-300">{req.priority}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">{getStatusBadge(req.status)}</td>
                                                <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                                                    {formatDateWithTime(req.createdAt)}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <button
                                                        onClick={() => navigate(`/requests/${req.id}`)}
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/10 hover:border-blue-200 dark:border-blue-500/20 rounded-md transition-all cursor-pointer shadow-md"
                                                    >
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                        <span>Abrir</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center text-slate-500 italic">
                                                Nenhuma solicitação encontrada para este paciente.
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
                                className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white cursor-pointer text-xl"
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
                                    className="px-4 py-2 border border-slate-300 dark:border-slate-800 hover:border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-white rounded-md text-sm transition-all cursor-pointer"
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

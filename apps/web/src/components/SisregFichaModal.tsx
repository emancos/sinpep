import React from 'react';
import { useSisregFicha } from '../hooks/useRequests';
import { X, Loader2, User, Activity, Clock, ShieldAlert, AlertTriangle, Building, FileText, Calendar, Stethoscope } from 'lucide-react';

const REGULATORY_CENTERS: Record<string, string> = {
 '25C221': 'CENTRAL ESTADUAL - PB',
 '250400': 'CAMPINA GRANDE',
 '250750': 'JOAO PESSOA'
};

interface SisregFichaModalProps {
 isOpen: boolean;
 onClose: () => void;
 requestCode?: string;
}

export const SisregFichaModal: React.FC<SisregFichaModalProps> = ({ isOpen, onClose, requestCode }) => {
 const { data: ficha, isLoading, isError } = useSisregFicha(requestCode, isOpen);

 if (!isOpen) return null;

 const getStatusColor = (status: string) => {
 const s = status.toUpperCase();
 
 // 2. Status de Aprovação e Agendamento
 if (s.includes('AUTORIZADA') || s.includes('AGENDADA') || s.includes('CONFIRMADO') || s.includes('APROVADA')) {
 return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
 }
 
 // 3. Status de Devolução e Negação
 if (s.includes('DEVOLVIDA') || s.includes('NEGADA')) {
 return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
 }
 
 // 4 e 5. Status de Cancelamento e Falta
 if (s.includes('CANCELADA') || s.includes('CANCELADO') || s.includes('FALTA') || s.includes('INEXISTENTE')) {
 return 'text-red-500 bg-red-500/10 border-red-500/20';
 }
 
 // 1. Status de Pendência e Análise
 if (s.includes('PENDENTE') || s.includes('REENVIADA')) {
 return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
 }
 
 // Outros / Padrão
 return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
 };

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm">
 <div 
 className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800"
 onClick={(e) => e.stopPropagation()}
 >
 {/* Header */}
 <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
 <FileText className="w-5 h-5 text-blue-500" />
 </div>
 <div>
 <h2 className="text-lg font-bold text-slate-800 dark:text-white">Ficha do SISREG</h2>
 <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">Solicitação: #{requestCode}</p>
 </div>
 </div>
 <button 
 onClick={onClose}
 className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 {/* Content */}
 <div className="flex-1 overflow-y-auto p-6">
 {isLoading && (
 <div className="flex flex-col items-center justify-center py-20 space-y-4">
 <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
 <p className="text-sm text-slate-500 font-medium">Buscando informações oficiais no SISREG...</p>
 </div>
 )}

 {isError && (
 <div className="flex flex-col items-center justify-center py-16 text-center">
 <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
 <AlertTriangle className="w-8 h-8 text-red-500" />
 </div>
 <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Erro ao carregar Ficha</h3>
 <p className="text-slate-500 max-w-md">Não foi possível recuperar os dados desta solicitação no SISREG. Verifique se o código está correto ou se o SISREG está temporariamente indisponível.</p>
 </div>
 )}

 {!isLoading && !isError && ficha && (
 <div className="space-y-6">
 
 {/* Status and Risk Highlight */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className={`col-span-1 md:col-span-2 px-4 py-3 rounded-xl border flex items-center justify-between ${getStatusColor(ficha.request.status)}`}>
 <div className="flex items-center gap-3">
 <Activity className="w-5 h-5" />
 <div>
 <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Situação Atual no SISREG</p>
 <p className="font-bold">{ficha.request.status || 'NÃO INFORMADO'}</p>
 </div>
 </div>
 </div>
 <div className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
 <div>
 <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Risco / Prioridade</p>
 <p className="font-bold text-slate-800 dark:text-white mt-0.5">{ficha.request.risk?.replace(/<[^>]*>?/gm, '') || 'NÃO INFORMADO'}</p>
 </div>
 <ShieldAlert className="w-6 h-6 text-slate-400" />
 </div>
 </div>

 {/* Patient Data */}
 <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
 <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-2">
 <User className="w-4 h-4 text-slate-500" />
 <h3 className="font-semibold text-slate-700 dark:text-slate-200">Dados do Paciente</h3>
 </div>
 <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
 <div>
 <p className="text-xs text-slate-500">Nome</p>
 <p className="font-medium text-slate-800 dark:text-white">{ficha.patient.name}</p>
 </div>
 <div>
 <p className="text-xs text-slate-500">CNS</p>
 <p className="font-medium text-blue-500 font-mono">{ficha.patient.cns}</p>
 </div>
 <div>
 <p className="text-xs text-slate-500">Data de Nascimento</p>
 <p className="font-medium text-slate-800 dark:text-white">{ficha.patient.birthDate}</p>
 </div>
 <div>
 <p className="text-xs text-slate-500">Sexo</p>
 <p className="font-medium text-slate-800 dark:text-white">{ficha.patient.gender}</p>
 </div>
 <div className="md:col-span-2">
 <p className="text-xs text-slate-500">Nome da Mãe</p>
 <p className="font-medium text-slate-800 dark:text-white">{ficha.patient.motherName}</p>
 </div>
 </div>
 </div>

 {/* Request Data */}
 <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
 <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-2">
 <FileText className="w-4 h-4 text-slate-500" />
 <h3 className="font-semibold text-slate-700 dark:text-slate-200">Dados da Solicitação</h3>
 </div>
 <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
 <div className="md:col-span-2">
 <p className="text-xs text-slate-500">Procedimento(s) Solicitado(s)</p>
 <p className="font-semibold text-slate-800 dark:text-white text-base">{ficha.request.requestedProcedures || 'Não Informado'}</p>
 </div>
 <div className="md:col-span-2">
 <p className="text-xs text-slate-500">Diagnóstico Inicial (CID)</p>
 <div className="flex items-center gap-2 mt-1">
 <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-800 rounded font-mono font-bold text-xs">{ficha.request.cid || 'N/A'}</span>
 <span className="font-medium text-slate-800 dark:text-white">{ficha.request.initialDiagnosis || 'Não Informado'}</span>
 </div>
 </div>
 <div>
 <p className="text-xs text-slate-500">Médico Solicitante</p>
 <p className="font-medium text-slate-800 dark:text-white flex items-center gap-1.5">
 {ficha.request.requesterName || 'Não Informado'}
 </p>
 </div>
 <div>
 <p className="text-xs text-slate-500">Vaga Solicitada</p>
 <p className="font-medium text-slate-800 dark:text-white">{ficha.request.requestedVacancy || 'Não Informado'}</p>
 </div>
 <div className="md:col-span-2">
 <p className="text-xs text-slate-500">Central Reguladora</p>
 <p className="font-medium text-slate-800 dark:text-white flex items-center gap-1.5">
 <Building className="w-3.5 h-3.5 text-slate-400" />
 {ficha.request.regulatoryCenter ? (REGULATORY_CENTERS[ficha.request.regulatoryCenter] || ficha.request.regulatoryCenter) : 'Não Informado'}
 </p>
 </div>
 </div>
 </div>

 {/* Scheduling Data */}
 {ficha.request?.status?.toUpperCase().includes('AUTORIZADA / REGULADOR') && (
 <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl overflow-hidden">
 <div className="px-4 py-3 border-b border-emerald-500/20 bg-emerald-500/10 flex items-center gap-2">
 <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
 <h3 className="font-semibold text-emerald-800 dark:text-emerald-400">Dados do Agendamento</h3>
 </div>
 <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
 {ficha.scheduling.location && (
 <div className="md:col-span-2">
 <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 font-semibold uppercase tracking-wider">Unidade Executante</p>
 <p className="font-bold text-emerald-800 dark:text-emerald-200 mt-0.5 flex items-center gap-2">
 <Building className="w-4 h-4" />
 {ficha.scheduling.location}
 </p>
 </div>
 )}
 {ficha.scheduling.professional && (
 <div className="md:col-span-2">
 <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 font-semibold uppercase tracking-wider">Profissional</p>
 <p className="font-bold text-emerald-800 dark:text-emerald-200 mt-0.5 flex items-center gap-2">
 <Stethoscope className="w-4 h-4" />
 {ficha.scheduling.professional}
 </p>
 </div>
 )}
 {ficha.scheduling.date && (
 <div>
 <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 font-semibold uppercase tracking-wider">Data do Atendimento</p>
 <p className="font-bold text-emerald-800 dark:text-emerald-200 mt-0.5">{ficha.scheduling.date}</p>
 </div>
 )}
 {ficha.scheduling.time && (
 <div>
 <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 font-semibold uppercase tracking-wider">Hora</p>
 <p className="font-bold text-emerald-800 dark:text-emerald-200 mt-0.5">{ficha.scheduling.time}</p>
 </div>
 )}
 {ficha.scheduling.instructions && (
 <div className="md:col-span-2 mt-2 p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg border border-emerald-100 dark:border-emerald-800/50">
 <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 font-bold uppercase tracking-wider mb-1">Preparo / Instruções</p>
 <p className="text-emerald-800 dark:text-emerald-200 whitespace-pre-line text-sm">{ficha.scheduling.instructions}</p>
 </div>
 )}
 </div>
 </div>
 )}

 {/* History / Observations */}
 {ficha.history && ficha.history.length > 0 && (
 <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
 <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-2">
 <Clock className="w-4 h-4 text-slate-500" />
 <h3 className="font-semibold text-slate-700 dark:text-slate-200">Histórico de Observações</h3>
 </div>
 <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
 {ficha.history.map((h: any, idx: number) => (
 <div key={idx} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
 <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
 <div className="flex items-center gap-2">
 <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${h.authorRole?.includes('Regulador') ? 'bg-purple-500/10 text-purple-500' : 'bg-blue-500/10 text-blue-500'}`}>
 {h.authorRole?.replace(':', '') || 'Autor'}
 </span>
 <span className="font-medium text-slate-700 dark:text-slate-300 text-sm">{h.authorName}</span>
 </div>
 <div className="flex items-center gap-3 text-xs text-slate-500">
 <span className="font-mono">{h.date} às {h.time}</span>
 <span className={`px-2 py-0.5 rounded-md font-bold uppercase ${getStatusColor(h.status)} text-[10px]`}>
 {h.status}
 </span>
 </div>
 </div>
 <div className="mt-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-200 dark:border-slate-800">
 <p className="text-xs font-bold text-slate-500 uppercase mb-1">{h.noteTitle}</p>
 <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">{h.noteContent}</p>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Warnings */}
 {ficha.warnings && ficha.warnings.length > 0 && (
 <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
 <div className="flex items-center gap-2 mb-2 text-amber-600 dark:text-amber-400">
 <AlertTriangle className="w-5 h-5" />
 <h3 className="font-bold">Avisos do Município</h3>
 </div>
 <div className="space-y-2">
 {ficha.warnings.map((w: string, idx: number) => (
 <p key={idx} className="text-sm text-amber-700 dark:text-amber-500/90 whitespace-pre-line">{w}</p>
 ))}
 </div>
 </div>
 )}

 </div>
 )}
 </div>
 </div>
 </div>
 );
};

import React, { useState, useEffect } from 'react';
import { X, Mail, Paperclip, Send, Loader2 } from 'lucide-react';
import { useEmailRecipients, useSendRequestEmail } from '../hooks/useRequests';
import { useAuthStore } from '../store/useAuthStore';
import { toast } from 'sonner';

interface SendEmailModalProps {
 isOpen: boolean;
 onClose: () => void;
 request: any;
}

export const SendEmailModal: React.FC<SendEmailModalProps> = ({
 isOpen,
 onClose,
 request,
}) => {
 const { user } = useAuthStore();
 const { data: recipients, isLoading: isLoadingRecipients } = useEmailRecipients();
 const sendEmailMutation = useSendRequestEmail();

 const [recipientEmail, setRecipientEmail] = useState('');
 const [subject, setSubject] = useState('');
 const [body, setBody] = useState('');

 useEffect(() => {
 if (request && isOpen) {
 const primaryProcName =
 request.procedures?.[0]?.procedure?.name || 'PROCEDIMENTO';
 const formattedCode = String(request.code || '').padStart(5, '0');
 const tag = `[REGULASB-#${formattedCode}]`;
 const defaultSubject = `${tag} ${primaryProcName.toUpperCase()} - ${request.patient?.name?.toUpperCase() || 'PACIENTE'}`;

 const patientPhones =
 request.patient?.phones?.map((p: any) => p.phoneNumber).join(', ') ||
 'Não informado';
 const defaultBody = `BOM DIA\n\nSEGUE EM ANEXO REQUISIÇÕES E DOCUMENTAÇÃO DE PACIENTE PARA REALIZAÇÃO DE PROCEDIMENTO CONFORME REQUISIÇÃO EM ANEXO.\n\n\nGRATO(A), CONTATO DO PACIENTE: ${patientPhones}\n\nATT\n${user?.name?.toUpperCase() || 'USUÁRIO'} ${user?.phone || ''}\nSETOR DE REGULAÇÃO`;

 setSubject(defaultSubject);
 setBody(defaultBody);
 setRecipientEmail('');
 }
 }, [request, isOpen, user]);

 if (!isOpen || !request) return null;

 const handleSend = () => {
 if (!recipientEmail || !recipientEmail.trim()) {
 toast.error('Informe o e-mail do destinatário.');
 return;
 }

 sendEmailMutation.mutate(
 {
 id: request.id,
 recipientEmail: recipientEmail.trim(),
 subject,
 body,
 },
 {
 onSuccess: (data) => {
 toast.success(data.message || 'E-mail enviado com sucesso!');
 onClose();
 },
 onError: (error: any) => {
 toast.error(
 error.response?.data?.message ||
 'Erro ao enviar e-mail. Verifique as configurações SMTP.',
 );
 },
 },
 );
 };

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
 <div
 className="bg-white dark:bg-slate-900 rounded-md shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 transition-all"
 onClick={(e) => e.stopPropagation()}
 >
 {/* Header */}
 <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-md bg-emerald-500/10 flex items-center justify-center">
 <Mail className="w-5 h-5 text-emerald-500" />
 </div>
 <div>
 <h3 className="text-lg font-bold text-slate-800 dark:text-white">
 Enviar Solicitação por E-mail
 </h3>
 <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
 Disparo automatizado com anexos via SMTP
 </p>
 </div>
 </div>
 <button
 onClick={onClose}
 disabled={sendEmailMutation.isPending}
 className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 {/* Form Body */}
 <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
 <div>
 <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
 Para (Destinatário):
 </label>
 <div className="relative">
 <input
 type="email"
 list="saved-recipients-list"
 value={recipientEmail}
 onChange={(e) => setRecipientEmail(e.target.value)}
 placeholder={
 isLoadingRecipients
 ? 'Carregando contatos salvos...'
 : 'Digite ou selecione um e-mail salvo na lista'
 }
 disabled={sendEmailMutation.isPending}
 className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-800 dark:text-white px-4 py-2.5 focus:border-emerald-500 dark:focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 placeholder-slate-400 dark:placeholder-slate-500 transition-all"
 />
 <datalist id="saved-recipients-list">
 {recipients?.map((r) => (
 <option key={r.id} value={r.email}>
 {r.name ? `${r.name} (${r.email})` : r.email}
 </option>
 ))}
 </datalist>
 </div>
 <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
 * Novos e-mails digitados serão salvos automaticamente na lista para os próximos envios.
 </p>
 </div>

 <div>
 <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
 Assunto:
 </label>
 <input
 type="text"
 value={subject}
 onChange={(e) => setSubject(e.target.value)}
 disabled={sendEmailMutation.isPending}
 className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/60 font-medium text-slate-800 dark:text-white px-4 py-2.5 focus:border-emerald-500 dark:focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
 />
 </div>

 <div>
 <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
 Corpo da Mensagem:
 </label>
 <textarea
 rows={8}
 value={body}
 onChange={(e) => setBody(e.target.value)}
 disabled={sendEmailMutation.isPending}
 className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/60 font-mono text-sm text-slate-800 dark:text-slate-200 p-4 focus:border-emerald-500 dark:focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
 />
 </div>

 <div>
 <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
 Anexos da Solicitação ({request.attachments?.length || 0}):
 </label>
 {request.attachments && request.attachments.length > 0 ? (
 <div className="flex flex-wrap gap-2">
 {request.attachments.map((att: any) => (
 <div
 key={att.id}
 className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium"
 >
 <Paperclip className="h-3.5 w-3.5 text-emerald-500" />
 <span className="max-w-[220px] truncate">{att.name}</span>
 </div>
 ))}
 </div>
 ) : (
 <p className="text-sm text-slate-500 dark:text-slate-400 italic">
 Nenhum anexo no RegulaSB vinculado a esta solicitação.
 </p>
 )}
 </div>
 </div>

 {/* Footer */}
 <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 flex items-center justify-end space-x-3 border-t border-slate-200 dark:border-slate-800">
 <button
 type="button"
 onClick={onClose}
 disabled={sendEmailMutation.isPending}
 className="px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
 >
 Cancelar
 </button>
 <button
 type="button"
 onClick={handleSend}
 disabled={sendEmailMutation.isPending || !recipientEmail.trim()}
 className="px-5 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-md transition-all flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 cursor-pointer"
 >
 {sendEmailMutation.isPending ? (
 <>
 <Loader2 className="h-4 w-4 animate-spin" />
 <span>Enviando...</span>
 </>
 ) : (
 <>
 <Send className="h-4 w-4" />
 <span>Enviar E-mail</span>
 </>
 )}
 </button>
 </div>
 </div>
 </div>
 );
};

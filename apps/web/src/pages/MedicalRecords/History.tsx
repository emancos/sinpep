import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuthStore } from '../../store/useAuthStore';
import { useMedicalRecords } from '../../hooks/useMedicalRecords';
import type { MedicalRecord } from '../../hooks/useMedicalRecords';
import { Loader2, ArrowLeft, Plus, Calendar, FileText, Pill, Paperclip, Stethoscope, Clock, Activity, Search, Building2 } from 'lucide-react';
import { AttachmentViewer } from './AttachmentViewer';
import { ExportRecordModal } from './ExportRecordModal';
import { AuthThumbnail } from '../../components/AuthThumbnail';
import { FileDown } from 'lucide-react';
import { PrescriptionPrintModal } from '../../components/PrescriptionPrintModal';
import { MedicalCertificateModal } from '../../components/MedicalCertificateModal';
import { ApacReportModal } from '../../components/ApacReportModal';
import { MedicalDocumentDropdown } from '../../components/MedicalDocumentDropdown';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const MedicalHistory: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const token = useAuthStore(state => state.token);
  const permissions = useAuthStore(state => state.permissions);
  const isAdmin = permissions.includes('admin:access');

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [viewerFile, setViewerFile] = useState<{ url: string, type: string, name: string } | null>(null);
  const [expandedRecords, setExpandedRecords] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [recordForPrint, setRecordForPrint] = useState<MedicalRecord | null>(null);
  const [recordForCertificate, setRecordForCertificate] = useState<MedicalRecord | null>(null);
  const [recordForApac, setRecordForApac] = useState<MedicalRecord | null>(null);
  const [certificateModalDocType, setCertificateModalDocType] = useState<'atestado' | 'declaracao'>('atestado');

  const toggleRecord = (recordId: string) => {
    setExpandedRecords(prev => ({ ...prev, [recordId]: !prev[recordId] }));
  };

  const toggleStatusMutation = useMutation({
    mutationFn: async (recordId: string) => {
      await axios.patch(`${apiUrl}/patients/${id}/medical-records/${recordId}/status`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    onSuccess: () => {
      toast.success('Status do atendimento atualizado!');
      queryClient.invalidateQueries({ queryKey: ['medical-records', id] });
    },
    onError: () => toast.error('Erro ao atualizar status.'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (recordId: string) => {
      await axios.delete(`${apiUrl}/patients/${id}/medical-records/${recordId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    onSuccess: () => {
      toast.success('Atendimento excluído com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['medical-records', id] });
    },
    onError: () => toast.error('Erro ao excluir atendimento.'),
  });

  const { data: patient, isLoading: isPatientLoading } = useQuery({
    queryKey: ['patient', id],
    queryFn: async () => {
      const res = await axios.get(`${apiUrl}/patients/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data;
    },
    enabled: !!id && !!token
  });

  const { data: records, isLoading: isRecordsLoading } = useMedicalRecords(id || '');

  if (isPatientLoading || isRecordsLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  const canWrite = permissions.includes('medical-records:write') || isAdmin;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* HEADER */}
      <div className="flex items-center gap-3 mb-6">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <span className="text-slate-300 dark:text-slate-700">|</span>
        <button 
          onClick={() => navigate(`/patients/${id}`)}
          className="text-xs font-medium text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
        >
          Ver Detalhes do Paciente
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-md shadow-lg border border-slate-200 dark:border-slate-700 p-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start md:items-center gap-4 md:gap-6 text-center sm:text-left">
          <div className="w-20 h-20 shrink-0 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-3xl">
            {patient?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{patient?.name}</h1>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-4 mt-2 text-sm text-slate-600 dark:text-slate-400">
              <span>CPF: {patient?.cpf}</span>
              <span className="hidden sm:inline">•</span>
              <span>CNS: {patient?.cns || 'Não informado'}</span>
              <span className="hidden sm:inline">•</span>
              <span className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-0.5 rounded-full text-xs font-semibold">
                Nível de Atenção: {patient?.attentionLevel}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 w-full md:w-auto">
          <button 
            onClick={() => setIsExportModalOpen(true)}
            className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-md font-medium shadow-sm transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <FileDown className="w-4 h-4" /> Exportar PDF
          </button>
          {canWrite && (
          <button 
            onClick={() => navigate(`/medical-records/${id}/new`)}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium shadow-sm transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" /> Novo Atendimento
          </button>
        )}
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="mb-8">
        <div className="relative max-w-lg">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-slate-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por médico, CRM, especialidade ou CID..."
            className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md leading-5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm transition-colors"
          />
        </div>
      </div>

      {/* TIMELINE */}
      <div className="relative border-l-2 border-slate-200 dark:border-slate-700 ml-4 sm:ml-10">
        {(() => {
          const filteredRecords = records?.data.filter((record: MedicalRecord) => {
            if (!searchTerm) return true;
            const term = searchTerm.toLowerCase();
            if (record.doctor.name.toLowerCase().includes(term)) return true;
            const docProfile = record.doctor.doctors?.[0];
            if (docProfile) {
              if (docProfile.crm.toLowerCase().includes(term)) return true;
              const hasSpecialty = docProfile.doctorSpecialties?.some(s => s.specialty.name.toLowerCase().includes(term));
              if (hasSpecialty) return true;
            }
            if (record.cid10?.toLowerCase().includes(term)) return true;
            return false;
          }) || [];

          if (filteredRecords.length === 0) {
            return <div className="pl-10 text-slate-500 italic py-8">Nenhum atendimento encontrado.</div>;
          }

          return filteredRecords.map((record: MedicalRecord) => {
            const isExpanded = expandedRecords[record.id];
            
            return (
              <div key={record.id} className="mb-10 relative">
                {/* NODE */}
                <div className="absolute -left-[21px] bg-white dark:bg-slate-900 p-1 rounded-full border-2 border-blue-500 text-blue-600 dark:text-blue-400">
                  <Stethoscope className="w-6 h-6" />
                </div>
                
                {/* CARD */}
                <div className="ml-10">
                  <div 
                    onClick={() => toggleRecord(record.id)}
                    className={`bg-white dark:bg-slate-800 rounded-md shadow-lg border p-5 cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 transition-colors ${record.isActive === false ? 'opacity-60 border-red-200 dark:border-red-900' : 'border-slate-200 dark:border-slate-700'}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm mb-1">
                          <Calendar className="w-4 h-4 shrink-0" />
                          <span>{new Date(record.recordDate).toLocaleDateString('pt-BR')} às {new Date(record.recordDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div>
                          <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white flex items-start sm:items-center gap-2 leading-tight">
                            Atendimento por Dr(a). {record.doctor.name}
                          </h3>
                          {record.doctor.doctors?.[0] && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              CRM: {record.doctor.doctors[0].crm}/{record.doctor.doctors[0].crmState}
                              {record.doctor.doctors[0].doctorSpecialties && record.doctor.doctors[0].doctorSpecialties.length > 0 && 
                                ` • Especialidade(s): ${record.doctor.doctors[0].doctorSpecialties.map(s => s.specialty.name).join(', ')}`
                              }
                            </p>
                          )}
                          {record.executingUnitName && (
                            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1 flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5 shrink-0" />
                              <span>Unidade Executante: {record.executingUnitName}</span>
                              {record.executingUnitCnes && (
                                <span className="text-[11px] font-mono text-slate-400">({record.executingUnitCnes})</span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="self-start flex flex-col items-end gap-1.5 shrink-0">
                        {record.cid10 && (
                          <div className="flex flex-wrap gap-1 justify-end">
                            <span className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-1 rounded-full text-xs sm:text-sm font-medium border border-slate-200 dark:border-slate-600 whitespace-nowrap">
                              CID: {record.cid10}
                            </span>
                            {record.cid10Secondary && (
                              <span className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2.5 py-0.5 rounded-full text-xs font-normal border border-slate-200 dark:border-slate-600 whitespace-nowrap">
                                Sec: {record.cid10Secondary}
                              </span>
                            )}
                            {record.cid10AssociatedCauses && (
                              <span className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2.5 py-0.5 rounded-full text-xs font-normal border border-slate-200 dark:border-slate-600 whitespace-nowrap">
                                Assoc: {record.cid10AssociatedCauses}
                              </span>
                            )}
                          </div>
                        )}
                        <MedicalDocumentDropdown
                          label="Emitir Documentos"
                          onSelectPrescription={() => setRecordForPrint(record)}
                          onSelectCertificate={() => {
                            setCertificateModalDocType('atestado');
                            setRecordForCertificate(record);
                          }}
                          onSelectAttendanceDeclaration={() => {
                            setCertificateModalDocType('declaracao');
                            setRecordForCertificate(record);
                          }}
                          onSelectApacReport={() => setRecordForApac(record)}
                        />
                      </div>
                    </div>
                    
                    {!isExpanded && (
                      <p className="text-slate-600 dark:text-slate-400 mt-2 line-clamp-2">
                        {record.observation}
                      </p>
                    )}

                    {/* EXPANDED CONTENT */}
                    {isExpanded && (
                      <div className="mt-6 space-y-6 animate-in slide-in-from-top-2 duration-300">
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                            <FileText className="w-4 h-4 text-blue-500" /> Prescrição e Observações
                          </h4>
                          <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-md text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                            {record.observation}
                          </div>
                        </div>

                        {record.medications && record.medications.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                              <Pill className="w-4 h-4 text-green-500" /> Medicações Relacionadas
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {record.medications.map((med: any, i: number) => (
                                <div key={i} className="bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 px-3 py-1.5 rounded-md border border-green-200 dark:border-green-800/50 text-sm">
                                  <strong>{med.name}</strong> - {med.dosage}
                                </div>
                              ))}
                            </div>
                              {record.medicationsJustification && (
                                <div className="mt-3 text-sm text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-3 rounded-md border border-slate-200 dark:border-slate-800 italic">
                                  <strong>Justificativa:</strong> {record.medicationsJustification}
                                </div>
                              )}
                            </div>
                          )}

                        {record.requestedExams && record.requestedExams.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                              <Activity className="w-4 h-4 text-blue-500" /> Exames e Procedimentos Solicitados
                            </h4>
                            <ul className="list-disc list-inside space-y-1 text-sm text-slate-700 dark:text-slate-300">
                              {record.requestedExams.map((exam: string, i: number) => (
                                <li key={i}>{exam}</li>
                              ))}
                            </ul>
                              {record.examsJustification && (
                                <div className="mt-3 text-sm text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-3 rounded-md border border-slate-200 dark:border-slate-800 italic">
                                  <strong>Justificativa:</strong> {record.examsJustification}
                                </div>
                              )}
                            </div>
                          )}

                        {record.attachments && record.attachments.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                              <Paperclip className="w-4 h-4 text-purple-500" /> Anexos
                            </h4>
                            <div className="flex flex-wrap gap-4">
                                {record.attachments.map((file) => {
                                  const actualFileUrl = file.fileUrl.startsWith('/api/storage') 
                                    ? file.fileUrl.replace('/api/storage', '/storage') 
                                    : file.fileUrl;
                                  return (
                                    <div 
                                      key={file.id} 
                                      onClick={(e) => { e.stopPropagation(); setViewerFile({ url: `${apiUrl}${actualFileUrl}`, type: file.fileType, name: file.fileName }); }}
                                      className="w-24 h-24 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md flex flex-col items-center justify-center gap-2 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                                    >
                                      <AuthThumbnail url={`${apiUrl}${actualFileUrl}`} type={file.fileType} name={file.fileName} />
                                      <span className="text-xs text-slate-500 truncate w-full px-2 text-center">{file.fileName}</span>
                                    </div>
                                  );
                                })}
                            </div>
                              {record.medicationsJustification && (
                                <div className="mt-3 text-sm text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-3 rounded-md border border-slate-200 dark:border-slate-800 italic">
                                  <strong>Justificativa:</strong> {record.medicationsJustification}
                                </div>
                              )}
                            </div>
                          )}

                        {record.returnRequestedValue && (
                          <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10 p-3 rounded-md border border-orange-200 dark:border-orange-500/20">
                            <Clock className="w-5 h-5" />
                            <span className="font-medium">
                              Retorno Solicitado: {record.returnRequestedValue} {record.returnRequestedUnit?.toLowerCase() || 'dias'}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {isAdmin && isExpanded && (
                      <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 flex flex-wrap gap-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleStatusMutation.mutate(record.id); }}
                          className="px-4 py-2 text-sm font-medium rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                        >
                          {record.isActive === false ? 'Habilitar Atendimento' : 'Desabilitar Atendimento'}
                        </button>
                        <button
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            if(window.confirm('Tem certeza que deseja DELETAR este atendimento? Esta ação não pode ser desfeita.')) {
                              deleteMutation.mutate(record.id);
                            }
                          }}
                          className="px-4 py-2 text-sm font-medium rounded-md bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                        >
                          Deletar Atendimento
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          });
        })()}
      </div>

      {isExportModalOpen && (
        <ExportRecordModal 
          patient={patient} 
          records={records?.data || []} 
          onClose={() => setIsExportModalOpen(false)} 
        />
      )}

      {viewerFile && (
        <AttachmentViewer 
          file={viewerFile} 
          onClose={() => setViewerFile(null)} 
        />
      )}

      {recordForPrint && (
        <PrescriptionPrintModal
          isOpen={!!recordForPrint}
          onClose={() => setRecordForPrint(null)}
          patient={patient}
          record={recordForPrint}
          executingUnit={{
            name: recordForPrint.executingUnitName,
            cnes: recordForPrint.executingUnitCnes
          }}
        />
      )}

      {recordForCertificate && (
        <MedicalCertificateModal
          isOpen={!!recordForCertificate}
          onClose={() => setRecordForCertificate(null)}
          initialDocType={certificateModalDocType}
          patient={patient}
          record={recordForCertificate}
          executingUnit={{
            name: recordForCertificate.executingUnitName,
            cnes: recordForCertificate.executingUnitCnes
          }}
        />
      )}

      {recordForApac && (
        <ApacReportModal
          isOpen={!!recordForApac}
          onClose={() => setRecordForApac(null)}
          patient={patient}
          record={recordForApac}
          executingUnit={{
            name: recordForApac.executingUnitName,
            cnes: recordForApac.executingUnitCnes
          }}
        />
      )}
    </div>
  );
};

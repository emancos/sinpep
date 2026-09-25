import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAuthStore } from '../../store/useAuthStore';
import { useMedicalRecords } from '../../hooks/useMedicalRecords';
import type { MedicalRecord } from '../../hooks/useMedicalRecords';
import { Loader2, ArrowLeft, Plus, Calendar, FileText, Pill, Paperclip, Stethoscope, Clock, Activity } from 'lucide-react';
import { AttachmentViewer } from './AttachmentViewer';
import { ExportRecordModal } from './ExportRecordModal';
import { FileDown } from 'lucide-react';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const MedicalHistory: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const token = useAuthStore(state => state.token);
  const permissions = useAuthStore(state => state.permissions);
  const isAdmin = permissions.includes('admin:access');

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [viewerFile, setViewerFile] = useState<{ url: string, type: string, name: string } | null>(null);
  const [expandedRecords, setExpandedRecords] = useState<Record<string, boolean>>({});

  const toggleRecord = (recordId: string) => {
    setExpandedRecords(prev => ({ ...prev, [recordId]: !prev[recordId] }));
  };

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
      <button 
        onClick={() => navigate('/medical-records')}
        className="flex items-center gap-2 text-slate-500 hover:text-blue-600 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar para Busca
      </button>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-8 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-3xl">
            {patient?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{patient?.name}</h1>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-600 dark:text-slate-400">
              <span>CPF: {patient?.cpf}</span>
              <span>•</span>
              <span>CNS: {patient?.cns || 'Não informado'}</span>
              <span>•</span>
              <span className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-0.5 rounded-full text-xs font-semibold">
                Nível de Atenção: {patient?.attentionLevel}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button 
            onClick={() => setIsExportModalOpen(true)}
            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl font-medium shadow-sm transition-colors flex items-center gap-2 whitespace-nowrap text-sm"
          >
            <FileDown className="w-4 h-4" /> Exportar PDF
          </button>
          {canWrite && (
          <button 
            onClick={() => navigate(`/medical-records/${id}/new`)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-medium shadow-sm transition-colors flex items-center gap-2 whitespace-nowrap text-sm"
          >
            <Plus className="w-4 h-4" /> Novo Atendimento
          </button>
        )}
        </div>
      </div>

      {/* TIMELINE */}
      <div className="relative border-l-2 border-slate-200 dark:border-slate-700 ml-4 sm:ml-10">
        {records?.data.length === 0 ? (
          <div className="pl-10 text-slate-500 italic py-8">Nenhum atendimento registrado no histórico.</div>
        ) : (
          records?.data.map((record: MedicalRecord) => {
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
                    className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm mb-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(record.recordDate).toLocaleDateString('pt-BR')} às {new Date(record.recordDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                          Atendimento por Dr(a). {record.doctor.name}
                        </h3>
                      </div>
                      {record.cid10 && (
                        <span className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-1 rounded-full text-sm font-medium border border-slate-200 dark:border-slate-600">
                          CID: {record.cid10}
                        </span>
                      )}
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
                          <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
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
                                <div key={i} className="bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 px-3 py-1.5 rounded-lg border border-green-200 dark:border-green-800/50 text-sm">
                                  <strong>{med.name}</strong> - {med.dosage}
                                </div>
                              ))}
                            </div>
                              {record.medicationsJustification && (
                                <div className="mt-3 text-sm text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 italic">
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
                                <div className="mt-3 text-sm text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 italic">
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
                              {record.attachments.map((file) => (
                                <div 
                                  key={file.id} 
                                  onClick={(e) => { e.stopPropagation(); setViewerFile({ url: `${apiUrl}${file.fileUrl}`, type: file.fileType, name: file.fileName }); }}
                                  className="w-24 h-24 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                                >
                                  {file.fileType.includes('pdf') ? (
                                    <FileText className="w-8 h-8 text-rose-500" />
                                  ) : (
                                    <div className="w-full h-16 bg-cover bg-center rounded-t-md" style={{ backgroundImage: `url(${apiUrl}${file.fileUrl})` }} />
                                  )}
                                  <span className="text-xs text-slate-500 truncate w-full px-2 text-center">{file.fileName}</span>
                                </div>
                              ))}
                            </div>
                              {record.medicationsJustification && (
                                <div className="mt-3 text-sm text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 italic">
                                  <strong>Justificativa:</strong> {record.medicationsJustification}
                                </div>
                              )}
                            </div>
                          )}

                        {record.returnRequestedValue && (
                          <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10 p-3 rounded-lg border border-orange-200 dark:border-orange-500/20">
                            <Clock className="w-5 h-5" />
                            <span className="font-medium">
                              Retorno Solicitado: {record.returnRequestedValue} {record.returnRequestedUnit?.toLowerCase() || 'dias'}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
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
    </div>
  );
};

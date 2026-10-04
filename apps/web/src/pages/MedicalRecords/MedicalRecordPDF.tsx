import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { MedicalRecord } from '../../hooks/useMedicalRecords';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 11, color: '#333' },
  header: { marginBottom: 20, borderBottom: '1px solid #ccc', paddingBottom: 10 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 5, color: '#1e40af' },
  subtitle: { fontSize: 12, color: '#475569' },
  recordBlock: { marginBottom: 15, paddingBottom: 15, borderBottom: '1px solid #e2e8f0' },
  recordHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  recordDate: { fontSize: 12, fontWeight: 'bold', color: '#0f172a' },
  recordDoctor: { fontSize: 11, color: '#64748b' },
  sectionTitle: { fontSize: 10, fontWeight: 'bold', marginTop: 8, marginBottom: 4, color: '#3b82f6' },
  text: { fontSize: 10, lineHeight: 1.5, color: '#334155' },
  medicationRow: { flexDirection: 'row', marginTop: 2 },
  medName: { width: '40%', fontWeight: 'bold', fontSize: 10 },
  medDosage: { width: '60%', fontSize: 10 },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', color: '#94a3b8', fontSize: 9, borderTop: '1px solid #e2e8f0', paddingTop: 10 }
});

interface Props {
  patient: any;
  records: MedicalRecord[];
}

export const MedicalRecordPDF: React.FC<Props> = ({ patient, records }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>Prontuário Médico Eletrônico</Text>
        <Text style={styles.subtitle}>Paciente: {patient.name}</Text>
        <Text style={styles.subtitle}>CPF: {patient.cpf}  |  CNS: {patient.cns || 'N/A'}</Text>
      </View>

      {records.map((record) => (
        <View key={record.id} style={styles.recordBlock} wrap={false}>
          <View style={styles.recordHeader}>
            <Text style={styles.recordDate}>
              Atendimento em {new Date(record.recordDate).toLocaleDateString('pt-BR')} às {new Date(record.recordDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {record.cid10 && <Text style={styles.recordDoctor}>CID10: {record.cid10}</Text>}
          </View>
          <View style={{ marginBottom: 10 }}>
            <Text style={styles.recordDoctor}>Dr(a). {record.doctor.name}</Text>
            {record.doctor.doctors?.[0] && (
              <Text style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>
                CRM: {record.doctor.doctors[0].crm}/{record.doctor.doctors[0].crmState}
                {record.doctor.doctors[0].doctorSpecialties && record.doctor.doctors[0].doctorSpecialties.length > 0 && 
                  `  |  Especialidade(s): ${record.doctor.doctors[0].doctorSpecialties.map(s => s.specialty.name).join(', ')}`
                }
              </Text>
            )}
          </View>

          <Text style={styles.sectionTitle}>Prescrição e Observações:</Text>
          <Text style={styles.text}>{record.observation}</Text>

          {record.medications && record.medications.length > 0 && (
            <View>
              <Text style={styles.sectionTitle}>Medicações Relacionadas:</Text>
              {record.medications.map((med: any, i: number) => (
                <View key={i} style={styles.medicationRow}>
                  <Text style={styles.medName}>• {med.name}</Text>
                  <Text style={styles.medDosage}>{med.dosage}</Text>
                </View>
              ))}
              {record.medicationsJustification && (
                <Text style={[styles.text, { marginTop: 4, fontStyle: 'italic', fontSize: 9 }]}>
                  Justificativa da Prescrição: {record.medicationsJustification}
                </Text>
              )}
            </View>
          )}

          {record.requestedExams && record.requestedExams.length > 0 && (
            <View>
              <Text style={styles.sectionTitle}>Exames Solicitados:</Text>
              {record.requestedExams.map((exam: string, i: number) => (
                <Text key={i} style={styles.text}>• {exam}</Text>
              ))}
              {record.examsJustification && (
                <Text style={[styles.text, { marginTop: 4, fontStyle: 'italic', fontSize: 9 }]}>
                  Justificativa do Procedimento: {record.examsJustification}
                </Text>
              )}
            </View>
          )}

          {record.returnRequestedValue && (
            <View>
              <Text style={styles.sectionTitle}>Retorno Solicitado:</Text>
              <Text style={styles.text}>{record.returnRequestedValue} {record.returnRequestedUnit?.toLowerCase() || 'dias'}</Text>
            </View>
          )}
        </View>
      ))}

      <Text style={styles.footer} render={({ pageNumber, totalPages }) => (
        `Gerado pelo Sistema SIPEP - Página ${pageNumber} de ${totalPages}`
      )} fixed />
    </Page>
  </Document>
);

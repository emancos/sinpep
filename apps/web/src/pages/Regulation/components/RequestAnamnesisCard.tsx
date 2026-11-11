import React from 'react';
import { HeartPulse, Lock, Unlock } from 'lucide-react';

export interface AnamnesisFormValues {
  isHypertensive: boolean;
  isDiabetic: boolean;
  isSmoker: boolean;
  otherDiseases: string;
  isOncological: boolean;
  oncologicalStage: string;
  allergies: string;
  isPcd: boolean;
  pcdDescription: string;
  continuousMedications: string[];
  bloodPressure: string;
  glycemia: string;
  weight: string;
  height: string;
}

export const EMPTY_ANAMNESIS_FORM: AnamnesisFormValues = {
  isHypertensive: false,
  isDiabetic: false,
  isSmoker: false,
  otherDiseases: '',
  isOncological: false,
  oncologicalStage: '',
  allergies: '',
  isPcd: false,
  pcdDescription: '',
  continuousMedications: [],
  bloodPressure: '',
  glycemia: '',
  weight: '',
  height: '',
};

interface RequestAnamnesisCardProps {
  values: AnamnesisFormValues;
  onChange?: (next: AnamnesisFormValues) => void;
  editable: boolean;
  showLockBadge: boolean;
}

export const RequestAnamnesisCard: React.FC<RequestAnamnesisCardProps> = ({
  values,
  onChange,
  editable,
  showLockBadge,
}) => {
  const update = (patch: Partial<AnamnesisFormValues>) => {
    if (!editable || !onChange) return;
    onChange({ ...values, ...patch });
  };

  return (
    <div
      className={`bg-white dark:bg-slate-900 border rounded-xl p-5 shadow-xs space-y-4 ${
        showLockBadge && editable
          ? 'border-orange-300 dark:border-orange-700 ring-1 ring-orange-200 dark:ring-orange-900/40'
          : 'border-slate-200 dark:border-slate-800'
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <HeartPulse className="w-5 h-5 text-rose-600" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Anamnese do Paciente
          </h2>
        </div>

        {showLockBadge && (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
              editable
                ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {editable ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
            <span>{editable ? 'Liberado para correção' : 'Bloqueado'}</span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
        {[
          { key: 'isHypertensive', label: 'Hipertenso(a)' },
          { key: 'isDiabetic', label: 'Diabético(a)' },
          { key: 'isSmoker', label: 'Tabagista' },
          { key: 'isOncological', label: 'Oncológico' },
          { key: 'isPcd', label: 'Pessoa com Deficiência (PcD)' },
        ].map((flag) => {
          const checked = Boolean((values as any)[flag.key]);
          return (
            <label
              key={flag.key}
              className={`flex items-center gap-2 p-2 rounded-md border text-xs ${
                editable
                  ? 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 cursor-pointer'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 opacity-80 cursor-not-allowed'
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={!editable}
                onChange={(e) => update({ [flag.key]: e.target.checked } as Partial<AnamnesisFormValues>)}
                className="h-3.5 w-3.5 rounded text-rose-600 focus:ring-rose-500 disabled:opacity-60"
              />
              <span className="font-medium text-slate-700 dark:text-slate-200">{flag.label}</span>
            </label>
          );
        })}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        {[
          { key: 'bloodPressure', label: 'Pressão Arterial', placeholder: 'Ex: 120x80 mmHg' },
          { key: 'glycemia', label: 'Glicemia', placeholder: 'Ex: 98 mg/dL' },
          { key: 'weight', label: 'Peso (kg)', placeholder: 'Ex: 70' },
          { key: 'height', label: 'Altura (cm)', placeholder: 'Ex: 170' },
        ].map((item) => (
          <div key={item.key}>
            <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">{item.label}</label>
            <input
              type="text"
              value={(values as any)[item.key] || ''}
              disabled={!editable}
              onChange={(e) => update({ [item.key]: e.target.value } as Partial<AnamnesisFormValues>)}
              placeholder={editable ? item.placeholder : 'Não informado'}
              className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 disabled:bg-slate-50 dark:disabled:bg-slate-800/50 text-slate-800 dark:text-slate-200 text-xs"
            />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Alergias</label>
          <input
            type="text"
            value={values.allergies}
            disabled={!editable}
            onChange={(e) => update({ allergies: e.target.value })}
            placeholder={editable ? 'Descreva alergias conhecidas' : 'Nenhuma informada'}
            className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 disabled:bg-slate-50 dark:disabled:bg-slate-800/50 text-slate-800 dark:text-slate-200 text-xs"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Outras Doenças</label>
          <input
            type="text"
            value={values.otherDiseases}
            disabled={!editable}
            onChange={(e) => update({ otherDiseases: e.target.value })}
            placeholder={editable ? 'Comorbidades adicionais' : 'Nenhuma informada'}
            className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 disabled:bg-slate-50 dark:disabled:bg-slate-800/50 text-slate-800 dark:text-slate-200 text-xs"
          />
        </div>

        {values.isOncological && (
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
              Estadiamento Oncológico
            </label>
            <input
              type="text"
              value={values.oncologicalStage}
              disabled={!editable}
              onChange={(e) => update({ oncologicalStage: e.target.value })}
              placeholder="Estágio"
              className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 disabled:bg-slate-50 dark:disabled:bg-slate-800/50 text-slate-800 dark:text-slate-200 text-xs"
            />
          </div>
        )}

        {values.isPcd && (
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Descrição PcD</label>
            <input
              type="text"
              value={values.pcdDescription}
              disabled={!editable}
              onChange={(e) => update({ pcdDescription: e.target.value })}
              placeholder="Detalhes da condição"
              className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 disabled:bg-slate-50 dark:disabled:bg-slate-800/50 text-slate-800 dark:text-slate-200 text-xs"
            />
          </div>
        )}
      </div>

      <div>
        <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
          Medicamentos de Uso Contínuo (separados por vírgula)
        </label>
        <input
          type="text"
          value={values.continuousMedications.join(', ')}
          disabled={!editable}
          onChange={(e) =>
            update({
              continuousMedications: e.target.value
                .split(',')
                .map((m) => m.trim())
                .filter(Boolean),
            })
          }
          placeholder={editable ? 'Ex: Losartana 50mg, Metformina 850mg' : 'Nenhum informado'}
          className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 disabled:bg-slate-50 dark:disabled:bg-slate-800/50 text-slate-800 dark:text-slate-200 text-xs"
        />
      </div>
    </div>
  );
};


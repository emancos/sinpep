import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Pill, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { 
  createMedication, 
  updateMedication, 
  type Medication 
} from '../../services/medications';
import { useAuthStore } from '../../store/useAuthStore';
import { decodeHtmlEntities } from '../../utils/text';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  medicationToEdit: Medication | null;
}

export const CreateOrEditMedicationModal: React.FC<Props> = ({
  isOpen,
  onClose,
  medicationToEdit,
}) => {
  const token = useAuthStore(state => state.token);
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [laboratoryName, setLaboratoryName] = useState('');
  const [substanceDescription, setSubstanceDescription] = useState('');
  const [dosage, setDosage] = useState('');
  const [complement, setComplement] = useState('');
  const [category, setCategory] = useState('Similar');
  const [stripe, setStripe] = useState('Sem Tarja');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (medicationToEdit) {
      setName(decodeHtmlEntities(medicationToEdit.name) || '');
      setLaboratoryName(decodeHtmlEntities(medicationToEdit.laboratory) || '');
      setSubstanceDescription(decodeHtmlEntities(medicationToEdit.substanceDescription) || '');
      setDosage(decodeHtmlEntities(medicationToEdit.dosage) || '');
      setComplement(decodeHtmlEntities(medicationToEdit.complement) || '');
      setCategory(decodeHtmlEntities(medicationToEdit.category) || 'Similar');
      setStripe(decodeHtmlEntities(medicationToEdit.stripe) || 'Sem Tarja');
      setRegistrationNumber(decodeHtmlEntities(medicationToEdit.registrationNumber) || '');
      setIsActive(medicationToEdit.isActive ?? true);
    } else {
      setName('');
      setLaboratoryName('');
      setSubstanceDescription('');
      setDosage('');
      setComplement('');
      setCategory('Similar');
      setStripe('Sem Tarja');
      setRegistrationNumber('');
      setIsActive(true);
    }
  }, [medicationToEdit, isOpen]);

  const mutation = useMutation({
    mutationFn: (data: any) => {
      if (medicationToEdit) {
        return updateMedication(medicationToEdit.id, data, token!);
      }
      return createMedication(data, token!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications'] });
      queryClient.invalidateQueries({ queryKey: ['medication-stats'] });
      toast.success(
        medicationToEdit
          ? 'Medicamento atualizado com sucesso!'
          : 'Medicamento cadastrado com sucesso!'
      );
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Erro ao salvar medicamento.');
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('O nome comercial do medicamento é obrigatório.');
      return;
    }

    mutation.mutate({
      name: name.trim(),
      laboratoryName: laboratoryName.trim() || undefined,
      substanceDescription: substanceDescription.trim() || undefined,
      dosage: dosage.trim() || undefined,
      complement: complement.trim() || undefined,
      category: category.trim() || undefined,
      stripe: stripe.trim() || undefined,
      registrationNumber: registrationNumber.trim() || undefined,
      isActive,
      status: isActive ? 'Ativo' : 'Inativo',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 w-full max-w-xl rounded-lg shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-md">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {medicationToEdit ? 'Editar Medicamento' : 'Novo Medicamento'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {medicationToEdit ? 'Atualize as informações do catálogo' : 'Adicione um medicamento ao catálogo'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nome Comercial do Produto <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: NOVALGINA, AMOXIL, GLIFAGE..."
              className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Princípio Ativo / Substância
              </label>
              <input
                type="text"
                value={substanceDescription}
                onChange={e => setSubstanceDescription(e.target.value)}
                placeholder="Ex: dipirona monoidratada"
                className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Dosagem / Concentração
              </label>
              <input
                type="text"
                value={dosage}
                onChange={e => setDosage(e.target.value)}
                placeholder="Ex: 500mg, 20mg/ml, 1g..."
                className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Laboratório / Fabricante
              </label>
              <input
                type="text"
                value={laboratoryName}
                onChange={e => setLaboratoryName(e.target.value)}
                placeholder="Ex: EMS S/A, EUROFARMA..."
                className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Apresentação / Complemento
              </label>
              <input
                type="text"
                value={complement}
                onChange={e => setComplement(e.target.value)}
                placeholder="Ex: 500 MG COM REV, GOTAS 20ML..."
                className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Categoria Regulatória
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="Similar">Similar</option>
                <option value="Genérico">Genérico</option>
                <option value="Novo">Novo</option>
                <option value="Biológico">Biológico</option>
                <option value="Fitoterápico">Fitoterápico</option>
                <option value="Baixo Risco">Baixo Risco</option>
                <option value="Específico">Específico</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tarja
              </label>
              <select
                value={stripe}
                onChange={e => setStripe(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="Sem Tarja">Sem Tarja</option>
                <option value="Tarja Vermelha">Tarja Vermelha</option>
                <option value="Tarja Vermelha sob Retenção">Tarja Vermelha sob Retenção</option>
                <option value="Tarja Preta">Tarja Preta</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nº Registro ANVISA
              </label>
              <input
                type="text"
                value={registrationNumber}
                onChange={e => setRegistrationNumber(e.target.value)}
                placeholder="Ex: 113000267"
                className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isActive}
                onChange={e => setIsActive(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Medicamento ativo para prescrição clínica
              </span>
            </label>
          </div>

          <div className="p-4 -mx-6 -mb-6 mt-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={mutation.isPending}
              className="px-4 py-2 text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700 font-medium rounded-md text-sm transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md text-sm transition-colors cursor-pointer shadow-sm disabled:opacity-50"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Salvar Medicamento
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


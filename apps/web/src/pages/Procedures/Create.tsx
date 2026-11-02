import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ProcedureIntegraSusForm } from './ProcedureIntegraSusForm';
import { ArrowLeft, Stethoscope } from 'lucide-react';

export const CreateOrEditProcedure: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isEditMode = !!id;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                <button
                    type="button"
                    onClick={() => navigate('/procedures')}
                    className="flex items-center justify-center w-9 h-9 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                    title="Voltar para procedimentos"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Stethoscope className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        {isEditMode ? 'Editar Procedimento' : 'Novo Procedimento'}
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Configuração de regras clínicas, parâmetros de regulação e agendamentos
                    </p>
                </div>
            </div>

            <ProcedureIntegraSusForm
                procedureIdProp={id}
                onSuccessProp={() => navigate('/procedures')}
                onBackProp={() => navigate('/procedures')}
            />
        </div>
    );
};

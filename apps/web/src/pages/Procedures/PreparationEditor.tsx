import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProcedure, useProcedurePreparation, useSaveProcedurePreparation } from '../../hooks/useProcedures';
import { toast } from 'sonner';
import {
    ArrowLeft,
    Save,
    Clock,
    Users,
    AlertTriangle,
    Pill,
    Eye,
    Edit3,
    Bold,
    Italic,
    Underline,
    Strikethrough,
    List,
    ListOrdered,
    Heading1,
    Heading2,
    Heading3,
    Table,
    Eraser,
    Printer,
    Droplet
} from 'lucide-react';

export const PreparationEditor: React.FC<{ procedureIdProp?: string; onBackProp?: () => void }> = ({
    procedureIdProp,
    onBackProp
}) => {
    const { id: routeId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const procedureId = procedureIdProp || routeId || '';

    const { data: procedure, isLoading: loadingProc } = useProcedure(procedureId);
    const { data: preparation, isLoading: loadingPrep } = useProcedurePreparation(procedureId);
    const saveMutation = useSaveProcedurePreparation();

    const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
    const [title, setTitle] = useState('');
    const [fastingHours, setFastingHours] = useState(0);
    const [requiresCompanion, setRequiresCompanion] = useState(false);
    const [medicationInstructions, setMedicationInstructions] = useState('');
    const [contentHtml, setContentHtml] = useState('');

    const editorRef = useRef<HTMLDivElement>(null);

    // Carregar dados existentes
    useEffect(() => {
        if (preparation) {
            setTitle(preparation.title || '');
            setFastingHours(preparation.fastingHours ?? 0);
            setRequiresCompanion(preparation.requiresCompanion ?? false);
            setMedicationInstructions(preparation.medicationInstructions || '');
            setContentHtml(preparation.contentHtml || '');
            if (editorRef.current && activeTab === 'edit') {
                editorRef.current.innerHTML = preparation.contentHtml || '';
            }
        } else if (procedure) {
            const defaultTitle = `Instruções de Preparo Clínico: ${procedure.name}`;
            setTitle(defaultTitle);
            const initialHtml = `
                <p>Favor seguir rigorosamente as orientações abaixo para a realização adequada do procedimento.</p>
                <h3>1. Cuidados Gerais</h3>
                <ul>
                    <li>Comparecer ao local do exame com 30 minutos de antecedência.</li>
                    <li>Apresentar documento oficial com foto e Cartão SUS.</li>
                    <li>Trazer exames laboratoriais ou de imagem anteriores relacionados.</li>
                </ul>
            `;
            setContentHtml(initialHtml);
            if (editorRef.current && activeTab === 'edit') {
                editorRef.current.innerHTML = initialHtml;
            }
        }
    }, [preparation, procedure]);

    // Manter sincronizado quando mudar para aba edit
    useEffect(() => {
        if (activeTab === 'edit' && editorRef.current) {
            editorRef.current.innerHTML = contentHtml;
        }
    }, [activeTab]);

    const execCmd = (command: string, value: string | undefined = undefined) => {
        document.execCommand(command, false, value);
        if (editorRef.current) {
            setContentHtml(editorRef.current.innerHTML);
        }
    };

    const insertClinicalBox = (type: 'fasting' | 'warning' | 'medication' | 'companion' | 'hydration') => {
        let boxHtml = '';
        if (type === 'fasting') {
            boxHtml = `
                <div style="background-color: #FEF3C7; border-left: 4px solid #D97706; padding: 12px; margin: 12px 0; border-radius: 4px; color: #92400E;">
                    <strong>⏳ JEJUM OBRIGATÓRIO:</strong> Manter jejum absoluto (inclusive água) por ${fastingHours || 8} horas antes do horário agendado.
                </div>
            `;
        } else if (type === 'warning') {
            boxHtml = `
                <div style="background-color: #FEE2E2; border-left: 4px solid #DC2626; padding: 12px; margin: 12px 0; border-radius: 4px; color: #991B1B;">
                    <strong>⚠️ ATENÇÃO IMPORTANTE:</strong> O não cumprimento das recomendações implicará no cancelamento do exame por inviabilidade técnica.
                </div>
            `;
        } else if (type === 'medication') {
            boxHtml = `
                <div style="background-color: #E0E7FF; border-left: 4px solid #4F46E5; padding: 12px; margin: 12px 0; border-radius: 4px; color: #3730A3;">
                    <strong>💊 ORIENTAÇÕES DE MEDICAMENTOS:</strong> Medicamentos de uso contínuo (como hipertensão) podem ser tomados com pouca água. Anticoagulantes devem ser avaliados com seu médico.
                </div>
            `;
        } else if (type === 'companion') {
            boxHtml = `
                <div style="background-color: #EDE9FE; border-left: 4px solid #7C3AED; padding: 12px; margin: 12px 0; border-radius: 4px; color: #5B21B6;">
                    <strong>👥 ACOMPANHANTE:</strong> É obrigatória a presença de um acompanhante maior de 18 anos durante todo o período do procedimento.
                </div>
            `;
        } else if (type === 'hydration') {
            boxHtml = `
                <div style="background-color: #E0F2FE; border-left: 4px solid #0284C7; padding: 12px; margin: 12px 0; border-radius: 4px; color: #075985;">
                    <strong>💧 INGESTÃO DE ÁGUA / BEXIGA CHEIA:</strong> Ingerir 4 a 6 copos de água cerca de 1 hora antes do exame e NÃO urinar.
                </div>
            `;
        }

        document.execCommand('insertHTML', false, boxHtml + '<p></p>');
        if (editorRef.current) {
            setContentHtml(editorRef.current.innerHTML);
        }
    };

    const insertScheduleTable = () => {
        const tableHtml = `
            <table style="width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px;">
                <thead>
                    <tr style="background-color: #F1F5F9; text-align: left;">
                        <th style="border: 1px solid #CBD5E1; padding: 8px;">Horário</th>
                        <th style="border: 1px solid #CBD5E1; padding: 8px;">Etapa do Preparo</th>
                        <th style="border: 1px solid #CBD5E1; padding: 8px;">Alimentação / Cuidados</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="border: 1px solid #CBD5E1; padding: 8px;">Véspera (20h)</td>
                        <td style="border: 1px solid #CBD5E1; padding: 8px;">Jantar Leve</td>
                        <td style="border: 1px solid #CBD5E1; padding: 8px;">Sopas, torradas e líquidos sem açúcar. Evitar gorduras e leite.</td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #CBD5E1; padding: 8px;">Véspera (22h)</td>
                        <td style="border: 1px solid #CBD5E1; padding: 8px;">Início do Jejum</td>
                        <td style="border: 1px solid #CBD5E1; padding: 8px;">Jejum total de sólidos até a realização do exame.</td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #CBD5E1; padding: 8px;">Dia do Exame</td>
                        <td style="border: 1px solid #CBD5E1; padding: 8px;">Chegada na Unidade</td>
                        <td style="border: 1px solid #CBD5E1; padding: 8px;">Apresentar-se em jejum na recepção da unidade executante.</td>
                    </tr>
                </tbody>
            </table>
            <p></p>
        `;
        document.execCommand('insertHTML', false, tableHtml);
        if (editorRef.current) {
            setContentHtml(editorRef.current.innerHTML);
        }
    };

    const handleSave = () => {
        let currentHtml = contentHtml;
        if (activeTab === 'edit' && editorRef.current) {
            currentHtml = editorRef.current.innerHTML;
        }

        if (!title.trim()) {
            toast.error('Informe o título do preparo.');
            return;
        }

        saveMutation.mutate({
            procedureId,
            data: {
                title: title.trim(),
                contentHtml: currentHtml,
                fastingHours: Number(fastingHours),
                requiresCompanion: Boolean(requiresCompanion),
                medicationInstructions: medicationInstructions.trim() || null,
            }
        }, {
            onSuccess: () => {
                toast.success('Instruções de preparo salvas com sucesso!');
            },
            onError: (err: any) => {
                toast.error(err?.response?.data?.message || 'Erro ao salvar preparo.');
            }
        });
    };

    const handleBack = () => {
        if (onBackProp) onBackProp();
        else navigate('/procedures');
    };

    if (loadingProc || loadingPrep) {
        return (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Carregando preparo do procedimento...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm">
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleBack}
                        className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                        title="Voltar"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 font-bold">
                                {procedure?.code || 'SIGTAP'}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                {procedure?.procedureGroup?.name || 'Procedimento Clínico'}
                            </span>
                        </div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                            {procedure?.name || 'Preparo Clínico de Procedimento'}
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Botão de impressão */}
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
                        title="Imprimir Guia de Preparo"
                    >
                        <Printer className="w-4 h-4" />
                        <span className="hidden sm:inline">Imprimir</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saveMutation.isPending}
                        className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        {saveMutation.isPending ? 'Salvando...' : 'Salvar Preparo'}
                    </button>
                </div>
            </div>

            {/* Parâmetros Rápidos de Triagem Clínica */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
                {/* Jejum */}
                <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <Clock className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase">Jejum Recomendado</label>
                        <div className="flex items-center gap-2 mt-1">
                            <input
                                type="number"
                                min={0}
                                max={48}
                                value={fastingHours}
                                onChange={(e) => setFastingHours(Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-20 px-2 py-1 text-sm border border-slate-300 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-950 font-bold text-slate-900 dark:text-white"
                            />
                            <span className="text-xs text-slate-500">horas ({fastingHours === 0 ? 'Não exige' : `${fastingHours}h`})</span>
                        </div>
                    </div>
                </div>

                {/* Acompanhante */}
                <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                        <Users className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase">Acompanhante Adulto</label>
                        <label className="flex items-center gap-2 mt-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={requiresCompanion}
                                onChange={(e) => setRequiresCompanion(e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                {requiresCompanion ? 'Obrigatório' : 'Dispensável'}
                            </span>
                        </label>
                    </div>
                </div>

                {/* Medicamentos */}
                <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <Pill className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase">Alerta de Medicamentos</label>
                        <input
                            type="text"
                            value={medicationInstructions}
                            onChange={(e) => setMedicationInstructions(e.target.value)}
                            placeholder="Ex: Suspender anticoagulantes 48h antes"
                            className="w-full mt-1 px-2.5 py-1 text-xs border border-slate-300 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                        />
                    </div>
                </div>
            </div>

            {/* Título do Preparo */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-sm">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Título do Documento de Instruções *
                </label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    placeholder="Ex: Instruções de Preparo para Ultrassonografia do Abdome Total"
                />
            </div>

            {/* Editor & Preview Tabs */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
                {/* Abas */}
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 bg-slate-50 dark:bg-slate-800/40">
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                if (activeTab === 'edit' && editorRef.current) {
                                    setContentHtml(editorRef.current.innerHTML);
                                }
                                setActiveTab('edit');
                            }}
                            className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
                                activeTab === 'edit'
                                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                            }`}
                        >
                            <Edit3 className="w-4 h-4" />
                            Editor de Instruções
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                if (editorRef.current) {
                                    setContentHtml(editorRef.current.innerHTML);
                                }
                                setActiveTab('preview');
                            }}
                            className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
                                activeTab === 'preview'
                                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                            }`}
                        >
                            <Eye className="w-4 h-4" />
                            Pré-visualização do Paciente
                        </button>
                    </div>

                    <span className="text-xs text-slate-400 italic hidden sm:inline">
                        {activeTab === 'edit' ? 'Use a barra de ferramentas para formatar o texto' : 'Visualização da guia impressa ou digital'}
                    </span>
                </div>

                {/* ABA 1: Editor WYSIWYG */}
                {activeTab === 'edit' && (
                    <div>
                        {/* Toolbar */}
                        <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850 flex flex-wrap items-center gap-1.5">
                            {/* Tipografia */}
                            <div className="flex items-center gap-1 pr-2 border-r border-slate-300 dark:border-slate-700">
                                <button
                                    type="button"
                                    onClick={() => execCmd('formatBlock', '<h1>')}
                                    className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                                    title="Título 1"
                                >
                                    <Heading1 className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => execCmd('formatBlock', '<h2>')}
                                    className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                                    title="Título 2"
                                >
                                    <Heading2 className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => execCmd('formatBlock', '<h3>')}
                                    className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                                    title="Título 3"
                                >
                                    <Heading3 className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => execCmd('formatBlock', '<p>')}
                                    className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300"
                                    title="Parágrafo"
                                >
                                    P
                                </button>
                            </div>

                            {/* Estilos */}
                            <div className="flex items-center gap-1 pr-2 border-r border-slate-300 dark:border-slate-700">
                                <button
                                    type="button"
                                    onClick={() => execCmd('bold')}
                                    className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                                    title="Negrito"
                                >
                                    <Bold className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => execCmd('italic')}
                                    className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                                    title="Itálico"
                                >
                                    <Italic className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => execCmd('underline')}
                                    className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                                    title="Sublinhado"
                                >
                                    <Underline className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => execCmd('strikeThrough')}
                                    className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                                    title="Tachado"
                                >
                                    <Strikethrough className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Listas */}
                            <div className="flex items-center gap-1 pr-2 border-r border-slate-300 dark:border-slate-700">
                                <button
                                    type="button"
                                    onClick={() => execCmd('insertUnorderedList')}
                                    className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                                    title="Lista com Marcadores"
                                >
                                    <List className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => execCmd('insertOrderedList')}
                                    className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                                    title="Lista Numerada"
                                >
                                    <ListOrdered className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={insertScheduleTable}
                                    className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1 text-xs"
                                    title="Inserir Tabela de Horários"
                                >
                                    <Table className="w-4 h-4" />
                                    <span className="hidden md:inline">Tabela</span>
                                </button>
                            </div>

                            {/* Blocos Clínicos Prontos */}
                            <div className="flex items-center gap-1 pl-1">
                                <button
                                    type="button"
                                    onClick={() => insertClinicalBox('fasting')}
                                    className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 text-xs font-semibold rounded flex items-center gap-1"
                                >
                                    <Clock className="w-3.5 h-3.5" />
                                    + Jejum
                                </button>
                                <button
                                    type="button"
                                    onClick={() => insertClinicalBox('warning')}
                                    className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-800 dark:bg-red-950/60 dark:text-red-300 text-xs font-semibold rounded flex items-center gap-1"
                                >
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    + Alerta
                                </button>
                                <button
                                    type="button"
                                    onClick={() => insertClinicalBox('medication')}
                                    className="px-2 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 text-xs font-semibold rounded flex items-center gap-1"
                                >
                                    <Pill className="w-3.5 h-3.5" />
                                    + Remédios
                                </button>
                                <button
                                    type="button"
                                    onClick={() => insertClinicalBox('hydration')}
                                    className="px-2 py-1 bg-sky-100 hover:bg-sky-200 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 text-xs font-semibold rounded flex items-center gap-1"
                                >
                                    <Droplet className="w-3.5 h-3.5" />
                                    + Hidratação
                                </button>
                                <button
                                    type="button"
                                    onClick={() => execCmd('removeFormat')}
                                    className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 ml-auto"
                                    title="Limpar Formatação"
                                >
                                    <Eraser className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Editable Area */}
                        <div
                            ref={editorRef}
                            contentEditable
                            onInput={() => {
                                if (editorRef.current) {
                                    setContentHtml(editorRef.current.innerHTML);
                                }
                            }}
                            className="min-h-[380px] p-6 focus:outline-none text-slate-800 dark:text-slate-100 prose dark:prose-invert max-w-none leading-relaxed"
                            style={{ minHeight: '380px' }}
                        />
                    </div>
                )}

                {/* ABA 2: Pré-visualização do Paciente */}
                {activeTab === 'preview' && (
                    <div className="p-8 bg-slate-100 dark:bg-slate-950 flex justify-center">
                        <div className="bg-white text-slate-900 border border-slate-300 rounded-lg max-w-2xl w-full p-8 shadow-md">
                            {/* Cabeçalho da Guia */}
                            <div className="border-b-2 border-blue-900 pb-4 mb-6 flex justify-between items-start">
                                <div>
                                    <span className="text-[10px] uppercase font-bold text-blue-900 tracking-wider">
                                        Sistema Integrado de Regulação e Prontuário Eletrônico (SINPeP)
                                    </span>
                                    <h2 className="text-lg font-black text-slate-900 mt-1 uppercase">
                                        Guia de Preparo e Instruções Clínicas
                                    </h2>
                                    <p className="text-xs text-slate-600 mt-0.5">
                                        Procedimento: <strong>{procedure?.name}</strong> (Cód: {procedure?.code})
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="text-[11px] font-bold px-2 py-1 rounded bg-slate-100 border border-slate-300">
                                        SUS Municipal
                                    </span>
                                </div>
                            </div>

                            {/* Destaques Rápidos */}
                            <div className="grid grid-cols-2 gap-3 mb-6 bg-slate-50 border border-slate-200 rounded p-3 text-xs">
                                <div>
                                    <span className="text-slate-500 uppercase font-semibold text-[10px] block">Jejum Obrigatório:</span>
                                    <span className="font-bold text-slate-800">
                                        {fastingHours > 0 ? `${fastingHours} horas de jejum total` : 'Não exige jejum'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-500 uppercase font-semibold text-[10px] block">Acompanhante:</span>
                                    <span className="font-bold text-slate-800">
                                        {requiresCompanion ? 'Obrigatório acompanhante adulto' : 'Não obrigatório'}
                                    </span>
                                </div>
                                {medicationInstructions && (
                                    <div className="col-span-2 pt-2 border-t border-slate-200">
                                        <span className="text-slate-500 uppercase font-semibold text-[10px] block">Cuidados Farmacológicos:</span>
                                        <span className="font-semibold text-indigo-900">{medicationInstructions}</span>
                                    </div>
                                )}
                            </div>

                            {/* Conteúdo Formatado */}
                            <div
                                className="prose prose-sm max-w-none text-slate-800 leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: contentHtml || '<p class="italic text-slate-400">Nenhuma instrução cadastrada.</p>' }}
                            />

                            {/* Rodapé da Guia */}
                            <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between items-center text-[11px] text-slate-500">
                                <span>Em caso de dúvidas, procure sua Unidade Básica de Saúde de referência.</span>
                                <span>Emitido em: {new Date().toLocaleDateString('pt-BR')}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

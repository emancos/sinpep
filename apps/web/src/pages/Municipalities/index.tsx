import React, { useState, useRef } from 'react';
import {
  Building2,
  Search,
  Plus,
  Loader2,
  Copy,
  Check,
  Upload,
  Edit2,
  Trash2,
  X,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { useConfirm } from '../../contexts/ConfirmContext';
import {
  useMunicipalities,
  useCreateMunicipality,
  useUpdateMunicipality,
  useDeleteMunicipality,
  useUploadCoatOfArms,
} from '../../hooks/useMunicipalitiesAdmin';
import type { MunicipalityBranding } from '../../hooks/useMunicipalityBranding';

const apiUrl = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000';

export const MunicipalitiesPage: React.FC = () => {
  const confirm = useConfirm();
  const [search, setSearch] = useState('');
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Queries e Mutações
  const { data: municipalities, isLoading, isError } = useMunicipalities(search);
  const createMutation = useCreateMunicipality();
  const updateMutation = useUpdateMunicipality();
  const deleteMutation = useDeleteMunicipality();
  const uploadCoatOfArmsMutation = useUploadCoatOfArms();

  // Modal de Criação / Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    fullName: '',
    department: '',
    networkName: 'Rede Municipal de Atenção à Saúde',
    systemTitle: 'SINPeP',
    systemSubtitle: 'Sistema Integrado de Prontuário Eletrônico & Regulação',
    description: '',
    badgeText: 'Gestão Clínica e Assistencial',
    coatOfArmsUrl: '/brasao.png',
    primaryGradientStart: '#003366',
    primaryGradientEnd: '#001c3a',
    footerText: 'Acesso restrito a profissionais autorizados • Uso Institucional',
    supportContact: '',
    isDefault: false,
    isActive: true,
  });

  // Upload Brasão Rápido
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetId, setUploadTargetId] = useState<string | null>(null);

  const getAssetUrl = (url?: string | null) => {
    if (!url) return '/brasao.png';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    if (url.startsWith('/uploads/')) {
      return `${apiUrl}${url}`;
    }
    return url;
  };

  const handleCopyLink = (slug: string) => {
    const origin = window.location.origin;
    const directUrl = `${origin}/login?m=${slug}`;
    navigator.clipboard.writeText(directUrl);
    setCopiedSlug(slug);
    toast.success(`Link de acesso do município copiado! (${directUrl})`);
    setTimeout(() => setCopiedSlug(null), 3000);
  };

  const handleOpenCreate = () => {
    setModalMode('create');
    setEditingId(null);
    setFormData({
      name: '',
      slug: '',
      fullName: '',
      department: 'Secretaria Municipal de Saúde',
      networkName: 'Rede Municipal de Atenção à Saúde',
      systemTitle: 'SINPeP',
      systemSubtitle: 'Sistema Integrado de Prontuário Eletrônico & Regulação',
      description: 'Plataforma integrada de gestão assistencial e regulação municipal.',
      badgeText: 'Gestão Clínica e Assistencial',
      coatOfArmsUrl: '/brasao.png',
      primaryGradientStart: '#003366',
      primaryGradientEnd: '#001c3a',
      footerText: 'Acesso restrito a profissionais autorizados • Uso Institucional',
      supportContact: '',
      isDefault: false,
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: MunicipalityBranding) => {
    setModalMode('edit');
    setEditingId(item.id);
    setFormData({
      name: item.name,
      slug: item.slug,
      fullName: item.fullName,
      department: item.department,
      networkName: item.networkName || 'Rede Municipal de Atenção à Saúde',
      systemTitle: item.systemTitle || 'SINPeP',
      systemSubtitle: item.systemSubtitle || '',
      description: item.description || '',
      badgeText: item.badgeText || 'Gestão Clínica e Assistencial',
      coatOfArmsUrl: item.coatOfArmsUrl,
      primaryGradientStart: item.primaryGradientStart || '#003366',
      primaryGradientEnd: item.primaryGradientEnd || '#001c3a',
      footerText: item.footerText || '',
      supportContact: item.supportContact || '',
      isDefault: item.isDefault,
      isActive: item.isActive,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.slug.trim() || !formData.fullName.trim() || !formData.department.trim()) {
      toast.error('Preencha os campos obrigatórios (Nome, Slug, Prefeitura e Secretaria).');
      return;
    }

    try {
      if (modalMode === 'create') {
        await createMutation.mutateAsync(formData);
        toast.success('Município cadastrado com sucesso!');
      } else if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, data: formData });
        toast.success('Configurações do município atualizadas!');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erro ao salvar configurações do município.';
      toast.error(msg);
    }
  };

  const handleDelete = async (item: MunicipalityBranding) => {
    if (item.isDefault) {
      toast.warning('O município padrão do sistema não pode ser excluído.');
      return;
    }

    const confirmed = await confirm({
      title: 'Excluir Município',
      description: `Tem certeza que deseja remover as configurações do município "${item.name}" (${item.slug})?`,
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      variant: 'danger',
    });

    if (confirmed) {
      try {
        await deleteMutation.mutateAsync(item.id);
        toast.success('Município removido com sucesso!');
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Erro ao remover município.');
      }
    }
  };

  const handleTriggerUpload = (id: string) => {
    setUploadTargetId(id);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTargetId) return;

    try {
      await uploadCoatOfArmsMutation.mutateAsync({ id: uploadTargetId, file });
      toast.success('Brasão atualizado com sucesso!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao fazer upload do brasão.');
    } finally {
      setUploadTargetId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden file input for fast coat-of-arms upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                Municípios & Identidade Visual
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Configure a identidade institucional, brasão e textos da tela de login por município (acesso via <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-xs text-blue-600 dark:text-blue-400">?m=slug</code>).
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-sm transition-all duration-200 cursor-pointer active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Município</span>
        </button>
      </div>

      {/* Search & Stats Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por município, prefeitura ou slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Total: <strong className="text-slate-800 dark:text-slate-200">{municipalities?.length || 0}</strong> município(s) cadastrado(s)
        </div>
      </div>

      {/* Loading & Error States */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 space-y-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Carregando municípios...</p>
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center justify-center py-16 space-y-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-900/40 p-6">
          <AlertCircle className="w-8 h-8" />
          <p className="text-sm font-semibold">Ocorreu um erro ao carregar os municípios.</p>
        </div>
      )}

      {/* Grid de Municípios */}
      {!isLoading && !isError && municipalities && municipalities.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">Nenhum município encontrado</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md">
            Clique no botão "Novo Município" para cadastrar a identidade visual de um novo município ou unidade.
          </p>
        </div>
      )}

      {!isLoading && !isError && municipalities && municipalities.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {municipalities.map((item) => {
            const directUrl = `${window.location.origin}/login?m=${item.slug}`;
            const isCopied = copiedSlug === item.slug;

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group"
              >
                {/* Card Top Banner with Gradient Preview */}
                <div
                  style={{
                    background: `linear-gradient(135deg, ${item.primaryGradientStart || '#003366'} 0%, #002852 50%, ${item.primaryGradientEnd || '#001c3a'} 100%)`,
                  }}
                  className="p-5 text-white flex items-center justify-between relative overflow-hidden"
                >
                  <div className="flex items-center gap-3.5 z-10">
                    <div className="w-14 h-14 rounded-lg bg-white/10 backdrop-blur-md p-1 border border-white/20 flex items-center justify-center shrink-0 shadow-sm">
                      <img
                        src={getAssetUrl(item.coatOfArmsUrl)}
                        alt={`Brasão ${item.name}`}
                        onError={(e) => {
                          e.currentTarget.src = '/brasao.png';
                        }}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-white truncate max-w-[170px] leading-tight">
                          {item.name}
                        </h3>
                        {item.isDefault && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-300/40 text-[10px] font-bold tracking-wide uppercase shrink-0">
                            Padrão
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-blue-100/90 truncate max-w-[210px] mt-0.5">
                        {item.fullName}
                      </p>
                      <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-black/20 text-[10px] font-mono text-blue-200">
                        ?m={item.slug}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleTriggerUpload(item.id)}
                    className="z-10 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                    title="Alterar imagem do brasão"
                  >
                    <Upload className="w-4 h-4" />
                  </button>
                </div>

                {/* Card Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block text-[11px] font-medium uppercase tracking-wider">
                        Secretaria / Órgão
                      </span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                        {item.department}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block text-[11px] font-medium uppercase tracking-wider">
                        Título na Tela de Login
                      </span>
                      <p className="font-medium text-slate-700 dark:text-slate-300 truncate mt-0.5">
                        {item.systemTitle}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                        {item.description || item.systemSubtitle}
                      </p>
                    </div>
                  </div>

                  {/* Direct Link Box */}
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400 truncate select-all">
                      {directUrl}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyLink(item.slug)}
                      className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                        isCopied
                          ? 'bg-emerald-600 text-white'
                          : 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60'
                      }`}
                      title="Copiar link direto para este município"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopied ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <a
                      href={directUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      <span>Visualizar Login</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                        title="Editar configurações"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {!item.isDefault && (
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 transition-colors cursor-pointer"
                          title="Excluir município"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Criação / Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {modalMode === 'create' ? 'Cadastrar Novo Município' : 'Editar Configurações do Município'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Defina o slug de acesso e os textos personalizados para a tela de login.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nome do Município *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Palmares"
                    value={formData.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      // Se estiver criando e não tiver digitado o slug manualmente, sugere o slug
                      if (modalMode === 'create' && (!formData.slug || formData.slug === formData.name.toLowerCase().replace(/\s+/g, '-'))) {
                        setFormData({
                          ...formData,
                          name,
                          slug: name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-'),
                        });
                      } else {
                        setFormData({ ...formData, name });
                      }
                    }}
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Slug de Acesso (?m=slug) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: palmares"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Link gerado: <code className="font-mono text-blue-600 dark:text-blue-400">?m={formData.slug || 'slug'}</code>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nome Institucional / Prefeitura *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Prefeitura Municipal de Palmares"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Secretaria / Departamento *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Secretaria Municipal de Saúde"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Título do Sistema na Tela de Login
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: SINPeP Palmares"
                    value={formData.systemTitle}
                    onChange={(e) => setFormData({ ...formData, systemTitle: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Badge de Destaque
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Gestão Clínica e Assistencial"
                    value={formData.badgeText}
                    onChange={(e) => setFormData({ ...formData, badgeText: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Subtítulo / Slogan *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Sistema Integrado de Prontuário Eletrônico & Regulação"
                  value={formData.systemSubtitle}
                  onChange={(e) => setFormData({ ...formData, systemSubtitle: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Descrição na Faixa Lateral
                </label>
                <textarea
                  rows={2}
                  placeholder="Descrição sobre a rede assistencial deste município..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Cor Inicial do Gradiente
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.primaryGradientStart}
                      onChange={(e) => setFormData({ ...formData, primaryGradientStart: e.target.value })}
                      className="w-10 h-9 p-0.5 rounded border border-slate-200 dark:border-slate-700 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.primaryGradientStart}
                      onChange={(e) => setFormData({ ...formData, primaryGradientStart: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Cor Final do Gradiente
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.primaryGradientEnd}
                      onChange={(e) => setFormData({ ...formData, primaryGradientEnd: e.target.value })}
                      className="w-10 h-9 p-0.5 rounded border border-slate-200 dark:border-slate-700 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.primaryGradientEnd}
                      onChange={(e) => setFormData({ ...formData, primaryGradientEnd: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Texto do Rodapé
                </label>
                <input
                  type="text"
                  placeholder="Ex: Prefeitura Municipal de Palmares • Secretaria de Saúde"
                  value={formData.footerText}
                  onChange={(e) => setFormData({ ...formData, footerText: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Checkbox Default */}
              <div className="pt-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Definir como município padrão do sistema (carregado quando nenhum parâmetro for informado)
                  </span>
                </label>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  <span>Salvar Município</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

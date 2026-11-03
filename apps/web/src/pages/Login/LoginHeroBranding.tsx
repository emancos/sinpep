import React from 'react';
import {
  ShieldCheck,
  FileText,
  Users,
  Building2,
  Network,
  Pill,
  MapPin,
  RotateCcw,
} from 'lucide-react';
import { useMunicipalityBranding } from '../../hooks/useMunicipalityBranding';

export const LoginHeroBranding: React.FC = () => {
  const { branding, getAssetUrl, activeSlug } = useMunicipalityBranding();

  const handleResetToDefault = (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      localStorage.removeItem('sinpep_active_municipality');
    } catch {}
    const url = new URL(window.location.href);
    url.searchParams.delete('m');
    url.searchParams.delete('municipio');
    window.location.href = url.pathname;
  };

  const isCustomMunicipality = activeSlug && activeSlug !== 'padrao';

  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${branding.primaryGradientStart || '#003366'} 0%, #002852 50%, ${branding.primaryGradientEnd || '#001c3a'} 100%)`,
      }}
      className="w-full lg:w-1/2 xl:w-5/12 text-white p-8 sm:p-10 lg:p-12 xl:p-14 flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-700/50 transition-colors duration-500"
    >
      {/* Subtle background decoration */}
      <div className="absolute top-[-15%] right-[-15%] w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-15%] left-[-15%] w-80 h-80 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

      {/* Top: Brasão da Unidade / Município e Indicador */}
      <div className="relative z-10 flex flex-col gap-3">
        {isCustomMunicipality && (
          <div className="self-start inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 text-blue-100 text-[11px] font-medium backdrop-blur-md border border-white/20 shadow-sm animate-in fade-in">
            <MapPin className="w-3 h-3 text-amber-300" />
            <span>Município: <strong className="text-white font-semibold">{branding.name}</strong></span>
            <button
              type="button"
              onClick={handleResetToDefault}
              className="ml-1 text-blue-200 hover:text-white hover:underline cursor-pointer flex items-center gap-0.5 text-[10px]"
              title="Redefinir para o padrão do sistema"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>Padrão</span>
            </button>
          </div>
        )}

        <div className="flex items-center gap-4">
          <img
            src={getAssetUrl(branding.coatOfArmsUrl)}
            alt={`Brasão - ${branding.fullName}`}
            onError={(e) => {
              e.currentTarget.src = '/brasao.png';
            }}
            className="h-16 sm:h-20 w-auto object-contain drop-shadow transition-all duration-300 hover:scale-105"
          />
          <div>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-blue-200 block truncate max-w-[280px]">
              {branding.fullName}
            </span>
            <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
              {branding.department}
            </h2>
            {branding.networkName && branding.networkName !== branding.department && (
              <span className="text-[11px] text-blue-200/80 block mt-0.5">
                {branding.networkName}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Middle: Identidade e Soluções do Sistema */}
      <div className="relative z-10 my-8 sm:my-10 space-y-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-blue-100 text-xs font-medium backdrop-blur-sm border border-white/15 mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-300" />
            <span>{branding.badgeText}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {branding.systemTitle}
          </h1>
          <p className="text-sm text-blue-100/80 mt-1.5 leading-relaxed max-w-lg">
            {branding.description || branding.systemSubtitle}
          </p>
        </div>

        <div className="space-y-4 pt-2">
          <span className="text-xs uppercase tracking-wider text-blue-200/90 font-semibold block">
            Soluções da Rede
          </span>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-md bg-white/10 text-blue-200 shrink-0 border border-white/10 mt-0.5">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Prontuário Eletrônico do Paciente</h4>
                <p className="text-xs text-blue-100/75 mt-0.5 leading-relaxed">
                  Histórico dos atendimentos, evolução clínica, hipóteses diagnósticas (CID-10) e prescrições.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-md bg-white/10 text-blue-200 shrink-0 border border-white/10 mt-0.5">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Recepção e Fila de Atendimento</h4>
                <p className="text-xs text-blue-100/75 mt-0.5 leading-relaxed">
                  Acolhimento de pacientes, triagem por prioridades e encaminhamento para as salas.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-md bg-white/10 text-blue-200 shrink-0 border border-white/10 mt-0.5">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Ambulatórios e Salas</h4>
                <p className="text-xs text-blue-100/75 mt-0.5 leading-relaxed">
                  Organização de consultórios, escalas de profissionais e alocação por especialidades.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-md bg-white/10 text-blue-200 shrink-0 border border-white/10 mt-0.5">
                <Network className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Integração com UBS e Regulação</h4>
                <p className="text-xs text-blue-100/75 mt-0.5 leading-relaxed">
                  Fluxo unificado entre solicitação municipal, regulação de cotas e execução do atendimento.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-md bg-white/10 text-blue-200 shrink-0 border border-white/10 mt-0.5">
                <Pill className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Catálogo de Medicamentos</h4>
                <p className="text-xs text-blue-100/75 mt-0.5 leading-relaxed">
                  Consulta padronizada de substâncias, apresentações e dosagens com base na ANVISA.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: Rodapé e Aviso Institucional */}
      <div className="relative z-10 pt-4 border-t border-white/15 text-2xs text-blue-100/70 flex items-center justify-between">
        <span className="truncate max-w-[70%]">
          {branding.footerText || 'Acesso restrito a profissionais autorizados'}
        </span>
        <span className="shrink-0">{branding.name || 'Uso Institucional'}</span>
      </div>
    </div>
  );
};

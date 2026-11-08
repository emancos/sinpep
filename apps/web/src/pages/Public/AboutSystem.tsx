import {
  Info,
  Layers,
  Stethoscope,
  CalendarCheck,
  FileSpreadsheet,
  BarChart3,
  ShieldCheck,
  Building2,
  CheckCircle2,
  Cpu,
} from 'lucide-react';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';
import { APP_VERSION } from '../../config/version';

export function AboutSystem() {
  const pillars = [
    {
      title: 'Central de Regulação Municipal',
      description:
        'Triagem ágil de solicitações de consultas e exames, classificação de risco clínico, gestão transparente de filas de espera e distribuição justa de cotas por Unidade Básica de Saúde.',
      icon: Layers,
      color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-100 dark:border-blue-900/60',
    },
    {
      title: 'Prontuário Eletrônico do Paciente (PEP)',
      description:
        'Registro clínico estruturado com linha do tempo longitudinal, anamnese médica parametrizada, vinculação de diagnósticos CID-10, prescrições e justificativas clínicas integradas.',
      icon: Stethoscope,
      color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900/60',
    },
    {
      title: 'Agendas, Escalas & Acolhimento',
      description:
        'Planejamento de capacidade assistencial dos médicos e ambulatórios, controle de tempo por vaga, gerenciamento de filas presenciais na recepção e folha de presença em tempo real.',
      icon: CalendarCheck,
      color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border-purple-100 dark:border-purple-900/60',
    },
    {
      title: 'Faturamento SUS & Produção BPA',
      description:
        'Exportação nativa do Boletim de Produção Ambulatorial Individualizado (BPA-I) no padrão magnético oficial do DATASUS, com formulário impresso de 3 sequências por página e auditoria por hash SHA-256.',
      icon: FileSpreadsheet,
      color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-100 dark:border-amber-900/60',
    },
    {
      title: 'Inteligência em Saúde & BI',
      description:
        'Painéis e relatórios especializados para 6 perfis operacionais (Administrador, Regulador, Solicitante UBS, Coordenador de Unidade, Médico e Recepcionista), permitindo decisões baseadas em dados epidemiológicos.',
      icon: BarChart3,
      color: 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/40 border-cyan-100 dark:border-cyan-900/60',
    },
    {
      title: 'Segurança & Conformidade LGPD',
      description:
        'Controle estrito de acesso baseado em perfis (RBAC), isolamento de dados por estabelecimento de saúde, rastreabilidade de acessos e rigorosa proteção a dados sensíveis de saúde.',
      icon: ShieldCheck,
      color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-100 dark:border-rose-900/60',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col transition-colors">
      <PublicHeader />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12">
        {/* Hero Banner Minimalista */}
        <div className="text-center sm:text-left border-b border-slate-200 dark:border-slate-800 pb-8 mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/50 text-[#0051A2] dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/40 mb-3">
            <Info className="w-3.5 h-3.5" />
            <span>Ecossistema de Gestão Pública de Saúde</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Sobre o SINPeP
          </h1>
          <p className="mt-2 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
            O <strong>Sistema Integrado de Regulação Municipal e Prontuário Eletrônico (SINPeP)</strong> é uma solução tecnológica corporativa desenvolvida para unificar a regulação do acesso, o atendimento clínico e a gestão operacional da rede municipal de saúde.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-blue-600" />
              Versão do Sistema: <strong className="text-slate-800 dark:text-slate-200 font-mono">v{APP_VERSION}</strong>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-emerald-600" />
              Uso Institucional e Governamental
            </span>
          </div>
        </div>

        {/* Pilares Estratégicos */}
        <section className="space-y-6">
          <div className="mb-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Pilares e Módulos Integrados
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Desenvolvido sob medida para atender as diretrizes do SUS e a rotina dos profissionais de saúde:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pillars.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition"
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center border mb-3.5 ${item.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Compromisso com a Qualidade & Eficiência */}
        <section className="mt-10 bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Objetivo Assistencial e Gestão de Filas
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            O SINPeP tem como propósito primordial eliminar o desperdício de vagas e o absenteísmo na atenção secundária e especializada, garantindo que o cidadão seja atendido no momento correto, na unidade adequada e com base no critério técnico de prioridade clínica regulada.
          </p>
          <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-2xs text-slate-400">
            <span>Desenvolvido e mantido por <strong>Integra Sistemas</strong></span>
            <span>Tecnologia a serviço da saúde pública municipal</span>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

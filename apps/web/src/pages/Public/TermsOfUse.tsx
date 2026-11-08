import {
  Scale,
  CheckCircle2,
  KeyRound,
  ShieldAlert,
  AlertTriangle,
  History,
} from 'lucide-react';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';

export function TermsOfUse() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col transition-colors">
      <PublicHeader />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12">
        {/* Hero Banner */}
        <div className="text-center sm:text-left border-b border-slate-200 dark:border-slate-800 pb-8 mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/40 mb-3">
            <Scale className="w-3.5 h-3.5" />
            <span>Condições Institucionais de Acesso</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Termos de Uso
          </h1>
          <p className="mt-2 text-base text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
            Normas de utilização, deveres funcionais, segurança da informação e sigilo ético-profissional aplicáveis a todos os operadores e profissionais do sistema SINPeP.
          </p>

          <div className="mt-4 flex items-center gap-2 text-xs font-medium text-slate-400 dark:text-slate-500">
            <span>Última atualização: Novembro de 2026</span>
            <span>•</span>
            <span>Uso exclusivo em território municipal</span>
          </div>
        </div>

        {/* Seções de Termos */}
        <div className="space-y-6 text-xs sm:text-sm leading-relaxed">
          {/* Seção 1 */}
          <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-2.5 mb-3 text-slate-900 dark:text-white font-bold text-base">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <h2>1. Aceitação e Escopo Institucional</h2>
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              O acesso e a operação do <strong>SINPeP (Sistema Integrado de Regulação Municipal e Prontuário Eletrônico)</strong> são reservados estritamente a profissionais de saúde, servidores públicos e colaboradores autorizados pelas secretarias municipais de saúde competentes.
            </p>
            <p className="mt-2 text-slate-600 dark:text-slate-300">
              Ao autenticar-se na plataforma, o usuário declara concordar integralmente com as disposições estabelecidas neste documento e na legislação sanitária brasileira vigente.
            </p>
          </section>

          {/* Seção 2 */}
          <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-2.5 mb-3 text-slate-900 dark:text-white font-bold text-base">
              <KeyRound className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <h2>2. Credenciais de Acesso e Responsabilidade Pessoal</h2>
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              O login e a senha de acesso têm caráter estritamente pessoal, confidencial e intransferível. É expressamente proibido o compartilhamento de credenciais com terceiros, sob qualquer justificativa de conveniência operacional.
            </p>
            <p className="mt-2 text-slate-600 dark:text-slate-300">
              Cada ato praticado no sistema (regulação de pedidos, atendimento médico, prescrição, emissão de atestado ou faturamento BPA) é assinado eletronicamente e vinculado de maneira inequívoca à identidade do titular da conta.
            </p>
          </section>

          {/* Seção 3 */}
          <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-2.5 mb-3 text-slate-900 dark:text-white font-bold text-base">
              <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <h2>3. Sigilo Profissional e Ética Médica</h2>
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              As informações clínicas, anamneses, diagnósticos CID-10 e dados pessoais de pacientes cadastrados no SINPeP estão sob a guarda legal do segredo profissional, em conformidade com o Código de Ética Médica (Resolução CFM nº 2.217/2018), Código de Ética dos Profissionais de Enfermagem e legislação federal correlata.
            </p>
            <p className="mt-2 text-slate-600 dark:text-slate-300">
              A quebra imotivada ou não autorizada de sigilo clínico constitui infração ética grave, sujeitando o infrator às sanções disciplinares, cíveis e penais previstas no ordenamento jurídico brasileiro (art. 154 do Código Penal).
            </p>
          </section>

          {/* Seção 4 */}
          <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-2.5 mb-3 text-slate-900 dark:text-white font-bold text-base">
              <History className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
              <h2>4. Rastreabilidade, Logs e Auditoria Contínua</h2>
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              Para resguardo da segurança jurídica dos pacientes e dos próprios servidores, o SINPeP mantém trilhas completas de auditoria (logs de acesso, visualização de prontuários, alterações cadastrais, agendamentos e cancelamentos de vagas).
            </p>
            <p className="mt-2 text-slate-600 dark:text-slate-300">
              Os lotes oficiais exportados para o faturamento BPA são imutáveis e acompanhados de assinatura criptográfica de integridade SHA-256 para efeito de prestação de contas aos órgãos de controle (SUS, DENASUS, Tribunais de Contas).
            </p>
          </section>

          {/* Seção 5 */}
          <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-2.5 mb-3 text-slate-900 dark:text-white font-bold text-base">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <h2>5. Sanções e Penalidades</h2>
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              A utilização indevida da plataforma, a inserção intencional de dados inverídicos, a burla de regras de priorização de vagas da regulação ou a tentativa de acesso a dados fora de sua alçada operacional acarretarão a suspensão cautelar do acesso e abertura de procedimento administrativo apuratório.
            </p>
          </section>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

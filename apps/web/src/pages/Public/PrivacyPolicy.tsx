import { ShieldCheck, Lock, UserCheck, Database, KeyRound, AlertCircle, HeartHandshake } from 'lucide-react';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';

export const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-200">
      <PublicHeader />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Cabeçalho da Página */}
        <div className="mb-10 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 mb-3">
            <ShieldCheck className="w-4 h-4" />
            Em conformidade com a LGPD (Lei nº 13.709/2018)
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Políticas de Privacidade
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400">
            Saiba como o SINPeP coleta, trata, protege e gerencia os dados de saúde dos munícipes e profissionais.
          </p>
        </div>

        {/* Conteúdo Institucional */}
        <div className="space-y-8 bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm leading-relaxed text-sm sm:text-base">
          {/* Seção 1 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-bold text-lg">
              <Database className="w-5 h-5 text-[#0051A2] dark:text-blue-400 shrink-0" />
              <h2>1. Coleta e Finalidade dos Dados</h2>
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-justify">
              O <strong>SINPeP</strong> coleta exclusivamente os dados pessoais e dados pessoais sensíveis de saúde estritamente necessários para a execução de políticas públicas de saúde e cumprimento de obrigações legais no âmbito do Sistema Único de Saúde (SUS), tais como:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-300">
              <li><strong>Dados de Identificação do Paciente:</strong> Nome completo, CPF, Cartão Nacional de Saúde (CNS), data de nascimento, filiação, gênero e endereço residencial.</li>
              <li><strong>Dados Clínicos Sensíveis:</strong> Histórico de atendimentos médicos, diagnósticos (CID-10), prescrições medicamentosas, solicitações e resultados de exames complementares e registros de acolhimento.</li>
              <li><strong>Dados de Profissionais e Operadores:</strong> Nome, CPF, CNS, CBO/especialidade, registro em conselho de classe e credenciais de acesso corporativo.</li>
            </ul>
          </section>

          {/* Seção 2 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-bold text-lg">
              <Lock className="w-5 h-5 text-[#0051A2] dark:text-blue-400 shrink-0" />
              <h2>2. Segurança da Informação e Sigilo Médico</h2>
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-justify">
              Todas as transações de dados no SINPeP são protegidas por protocolos de criptografia em trânsito (TLS 1.3) e em repouso. O acesso aos dados clínicos é restrito estritamente a profissionais de saúde e autoridades de regulação devidamente habilitados, obedecendo às resoluções do Conselho Federal de Medicina (CFM), Conselho Federal de Enfermagem (COFEN) e Conselho Federal de Farmácia (CFF).
            </p>
            <p className="text-slate-600 dark:text-slate-300 text-justify">
              Todas as visualizações, edições e exportações de registros clínicos geram trilhas auditáveis imutáveis de segurança contendo endereço IP, identificador do usuário e registro temporal inequívoco.
            </p>
          </section>

          {/* Seção 3 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-bold text-lg">
              <KeyRound className="w-5 h-5 text-[#0051A2] dark:text-blue-400 shrink-0" />
              <h2>3. Compartilhamento Institucional com o SUS e DATASUS</h2>
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-justify">
              Os dados de produção ambulatorial e faturamento de procedimentos gerados na plataforma são exportados institucionalmente para sistemas oficiais do Ministério da Saúde (DATASUS / BPA-I / SISREG / e-SUS APS), com base nos arts. 7º, III e 11, II, "a" da Lei Geral de Proteção de Dados (LGPD).
            </p>
            <p className="text-slate-600 dark:text-slate-300 text-justify">
              <strong>Nenhum dado é comercializado, cedido ou compartilhado com terceiros para finalidades publicitárias, financeiras ou mercadológicas.</strong>
            </p>
          </section>

          {/* Seção 4 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-bold text-lg">
              <UserCheck className="w-5 h-5 text-[#0051A2] dark:text-blue-400 shrink-0" />
              <h2>4. Direitos do Titular dos Dados</h2>
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-justify">
              Conforme o art. 18 da LGPD, os cidadãos e pacientes atendidos pela rede pública municipal possuem o direito de:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-300">
              <li>Confirmar a existência de tratamento de seus registros clínicos e cadastrais;</li>
              <li>Acessar cópia de seus dados de prontuário e histórico de encaminhamentos junto à Secretaria Municipal de Saúde;</li>
              <li>Solicitar a correção de dados cadastrais incompletos, inexatos ou desatualizados;</li>
              <li>Obter informações sobre as entidades públicas e privadas com as quais os dados foram compartilhados.</li>
            </ul>
          </section>

          {/* Seção 5 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-bold text-lg">
              <HeartHandshake className="w-5 h-5 text-[#0051A2] dark:text-blue-400 shrink-0" />
              <h2>5. Retenção e Guarda dos Registros de Prontuário</h2>
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-justify">
              Em estrita conformidade com a Lei Federal nº 13.787/2018 (Prontuário Eletrônico do Paciente) e as resoluções do Conselho Federal de Medicina, os dados clínicos do prontuário eletrônico possuem prazo mandatório de guarda e preservação de <strong>no mínimo 20 (vinte) anos</strong> a contar do último atendimento, garantindo a integridade histórica dos registros assistenciais.
            </p>
          </section>

          {/* Seção 6 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-bold text-lg">
              <AlertCircle className="w-5 h-5 text-[#0051A2] dark:text-blue-400 shrink-0" />
              <h2>6. Contato com o Encarregado de Proteção de Dados (DPO)</h2>
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-justify">
              Para esclarecer dúvidas, exercer direitos de titularidade ou notificar incidentes relacionados à privacidade e proteção de dados pessoais, o cidadão ou profissional pode entrar em contato diretamente com a Ouvidoria do SUS ou o Encarregado de Dados da Secretaria Municipal de Saúde.
            </p>
          </section>

          {/* Rodapé Interno com Data */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 text-center">
            Última atualização: 08 de novembro de 2026.
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
 'pt-BR': {
 translation: {
 "Dashboard": "Início",
 "Patients": "Pacientes",
 "Health Centers": "Unidades de Saúde",
 "Health Agents": "Agentes de Saúde",
 "Doctors": "Médicos",
 "Procedures": "Procedimentos",
 "Logout": "Sair",
 "User Profile": "Perfil do Usuário",
 "Active Permissions": "Permissões Ativas",
 "Session Protected": "Sessão protegida via JWT",
 "Welcome": "Bem-vindo",
 "CPF": "CPF",
 "CNS": "CNS",
 "Birth Date": "Data de Nascimento",
 "Gender": "Gênero",
 "Actions": "Ações",
 "No Patients": "Nenhum paciente cadastrado.",
 "List of Patients": "Listagem de Pacientes",
 "Manage Patients": "Gerenciamento de Pacientes e seus Telefones",
 "Loading": "Carregando...",
 "Error Loading": "Erro ao carregar dados",
 }
 }
};

i18n
 .use(initReactI18next)
 .init({
 resources,
 lng: 'pt-BR',
 fallbackLng: 'pt-BR',
 interpolation: {
 escapeValue: false
 }
 });

export default i18n;


import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const routeNameMap: Record<string, string> = {
  'patients': 'Pacientes',
  'create': 'Novo',
  'edit': 'Editar',
  'health-centers': 'Unidades de Saúde',
  'doctors': 'Profissionais',
  'procedures': 'Procedimentos',
  'requests': 'Solicitações',
  'sisreg': 'Sisreg',
  'official': 'Agendamentos',
  'consultas': 'Consultas',
  'users': 'Usuários',
  'auxiliary-tables': 'Tabelas Auxiliares',
  'reports': 'Relatórios',
  'regulatory-center': 'Central de Regulação',
  'profile': 'Meu Perfil',
  'returned': 'Devolvidas',
  'canceled': 'Canceladas',
  're-requested': 'Reagendadas',
  'denied': 'Negadas',
  'details': 'Detalhes',
  'reply': 'Responder',
  'general': 'Geral',
  'medical-records': 'Prontuários',
  'new': 'Novo Atendimento',
  'reception': 'Recepção',
  'queue': 'Fila',
  'rooms': 'Ambulatórios',
};

const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const isSisregCode = (str: string) => /^\d+$/.test(str) && str.length > 4;

export const Breadcrumb = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  return (
    <nav className="flex items-center text-sm font-medium text-blue-200" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        <li>
          <Link
            to="/"
            className={`transition-colors flex items-center gap-1.5 ${pathnames.length === 0 ? 'text-white font-semibold cursor-default' : 'text-blue-200 hover:text-white'}`}
            onClick={(e) => pathnames.length === 0 && e.preventDefault()}
          >
            <Home className="w-4 h-4" />
            {pathnames.length === 0 && <span>Início</span>}
          </Link>
        </li>
        {pathnames.map((value, index) => {
          const isLast = index === pathnames.length - 1;
          const to = `/${pathnames.slice(0, index + 1).join('/')}`;

          let name = routeNameMap[value.toLowerCase()];
          if (!name) {
            if (uuidRegex.test(value)) {
              name = 'Detalhes';
            } else if (isSisregCode(value)) {
              name = `#${value}`;
            } else {
              // Capitalize first letter as fallback
              name = value.charAt(0).toUpperCase() + value.slice(1);
            }
          }

          return (
            <li key={to} className="flex items-center">
              <ChevronRight className="w-4 h-4 mx-1 text-blue-300/50" />
              {isLast ? (
                <span className="text-white font-semibold" aria-current="page">
                  {name}
                </span>
              ) : (
                <Link to={to} className="hover:text-white transition-colors">
                  {name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

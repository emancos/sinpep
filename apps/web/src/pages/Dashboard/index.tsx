import { useAuthStore } from '../../store/useAuthStore';

export function Dashboard() {
  const { user } = useAuthStore();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Bem-vindo, {user?.name}!</h1>
      <p>Este é o seu projeto base com autenticação.</p>
    </div>
  );
}

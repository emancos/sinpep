import { useAuthStore } from '../store/useAuthStore';

export const usePermission = () => {
 const permissions = useAuthStore((state) => state.permissions);

 const hasPermission = (action: string): boolean => {
 return permissions.includes(action);
 };

 return { hasPermission };
};

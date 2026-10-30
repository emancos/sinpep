import { create } from 'zustand';
import { isTokenExpired } from '../utils/token';

export interface User {
    id: string;
    name: string;
    email: string;
    phone?: string;
    avatar?: string;
    profileId?: string;
    profileName?: string;
    healthCenterId?: string;
    sisregUsername?: string;
}

interface AuthState {
    token: string | null;
    user: User | null;
    permissions: string[];
    isAuthenticated: boolean;
    login: (token: string, user: User, permissions: string[]) => void;
    logout: () => void;
    updateUser: (user: Partial<User>) => void;
    syncSession: (user: Partial<User>, permissions?: string[]) => void;
}

export const useAuthStore = create<AuthState>((set) => {
    // Safe parsing of localStorage
    const getSavedItem = (key: string) => {
        try {
            return localStorage.getItem(key);
        } catch {
            return null;
        }
    };

    const savedToken = getSavedItem('app_base_token');
    const isExpired = isTokenExpired(savedToken);

    // Se o token já estiver expirado na inicialização, limpa o estado residual
    if (savedToken && isExpired) {
        try {
            localStorage.removeItem('app_base_token');
            localStorage.removeItem('app_base_user');
            localStorage.removeItem('app_base_permissions');
        } catch {
            // Ignora erro de storage
        }
    }

    const validToken = !isExpired ? savedToken : null;
    const savedUser = validToken ? getSavedItem('app_base_user') : null;
    const savedPermissions = validToken ? getSavedItem('app_base_permissions') : null;

    let parsedUser: User | null = null;
    if (savedUser) {
        try {
            parsedUser = JSON.parse(savedUser);
        } catch {
            parsedUser = null;
        }
    }

    let parsedPermissions: string[] = [];
    if (savedPermissions) {
        try {
            parsedPermissions = JSON.parse(savedPermissions);
        } catch {
            parsedPermissions = [];
        }
    }

    return {
        token: validToken,
        user: parsedUser,
        permissions: parsedPermissions,
        isAuthenticated: !!validToken,

        login: (token, user, permissions) => {
            try {
                localStorage.setItem('app_base_token', token);
                localStorage.setItem('app_base_user', JSON.stringify(user));
                localStorage.setItem('app_base_permissions', JSON.stringify(permissions));
            } catch (e) {
                console.error('Failed to save auth state to localStorage:', e);
            }
            set({ token, user, permissions, isAuthenticated: true });
        },

        logout: () => {
            try {
                localStorage.removeItem('app_base_token');
                localStorage.removeItem('app_base_user');
                localStorage.removeItem('app_base_permissions');
            } catch (e) {
                console.error('Failed to clear auth state from localStorage:', e);
            }
            set({ token: null, user: null, permissions: [], isAuthenticated: false });
        },

        updateUser: (updatedFields) => {
            set((state) => {
                const newUser = state.user ? { ...state.user, ...updatedFields } : null;
                if (newUser) {
                    try {
                        localStorage.setItem('app_base_user', JSON.stringify(newUser));
                    } catch (e) {
                        console.error('Failed to save updated user state to localStorage:', e);
                    }
                }
                return { user: newUser };
            });
        },

        syncSession: (userData, newPermissions) => {
            set((state) => {
                const updatedUser = state.user ? { ...state.user, ...userData } : (userData as User);
                const updatedPermissions = newPermissions ?? state.permissions;
                try {
                    localStorage.setItem('app_base_user', JSON.stringify(updatedUser));
                    localStorage.setItem('app_base_permissions', JSON.stringify(updatedPermissions));
                } catch (e) {
                    console.error('Failed to sync session to localStorage:', e);
                }
                return { user: updatedUser, permissions: updatedPermissions };
            });
        },
    };
});

import { create } from 'zustand';

interface User {
    id: string;
    name: string;
    email: string;
    phone?: string;
    avatar?: string;
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
    const savedUser = getSavedItem('app_base_user');
    const savedPermissions = getSavedItem('app_base_permissions');

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
        token: savedToken || null,
        user: parsedUser,
        permissions: parsedPermissions,
        isAuthenticated: !!savedToken,

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
    };
});

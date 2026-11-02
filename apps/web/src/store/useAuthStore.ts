import { create } from 'zustand';
import { isTokenExpired } from '../utils/token';

export interface ActiveProfile {
    id: string;
    name: string;
    description?: string | null;
    isDefault?: boolean;
}

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
    activeProfile: ActiveProfile | null;
    availableProfiles: ActiveProfile[];
    isAuthenticated: boolean;
    login: (
        token: string,
        user: User,
        permissions: string[],
        activeProfile?: ActiveProfile | null,
        availableProfiles?: ActiveProfile[]
    ) => void;
    selectProfile: (activeProfile: ActiveProfile, permissions: string[], token?: string) => void;
    logout: () => void;
    updateUser: (user: Partial<User>) => void;
    syncSession: (
        user: Partial<User>,
        permissions?: string[],
        activeProfile?: ActiveProfile | null,
        availableProfiles?: ActiveProfile[]
    ) => void;
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
            localStorage.removeItem('app_base_active_profile');
            localStorage.removeItem('app_base_available_profiles');
        } catch {
            // Ignora erro de storage
        }
    }

    const validToken = !isExpired ? savedToken : null;
    const savedUser = validToken ? getSavedItem('app_base_user') : null;
    const savedPermissions = validToken ? getSavedItem('app_base_permissions') : null;
    const savedActiveProfile = validToken ? getSavedItem('app_base_active_profile') : null;
    const savedAvailableProfiles = validToken ? getSavedItem('app_base_available_profiles') : null;

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

    let parsedActiveProfile: ActiveProfile | null = null;
    if (savedActiveProfile) {
        try {
            parsedActiveProfile = JSON.parse(savedActiveProfile);
        } catch {
            parsedActiveProfile = null;
        }
    }

    let parsedAvailableProfiles: ActiveProfile[] = [];
    if (savedAvailableProfiles) {
        try {
            parsedAvailableProfiles = JSON.parse(savedAvailableProfiles);
        } catch {
            parsedAvailableProfiles = [];
        }
    }

    return {
        token: validToken,
        user: parsedUser,
        permissions: parsedPermissions,
        activeProfile: parsedActiveProfile,
        availableProfiles: parsedAvailableProfiles,
        isAuthenticated: !!validToken,

        login: (token, user, permissions, activeProfile, availableProfiles) => {
            try {
                localStorage.setItem('app_base_token', token);
                localStorage.setItem('app_base_user', JSON.stringify(user));
                localStorage.setItem('app_base_permissions', JSON.stringify(permissions));
                if (activeProfile) {
                    localStorage.setItem('app_base_active_profile', JSON.stringify(activeProfile));
                }
                if (availableProfiles) {
                    localStorage.setItem('app_base_available_profiles', JSON.stringify(availableProfiles));
                }
            } catch (e) {
                console.error('Failed to save auth state to localStorage:', e);
            }
            set({
                token,
                user,
                permissions,
                activeProfile: activeProfile || null,
                availableProfiles: availableProfiles || [],
                isAuthenticated: true,
            });
        },

        selectProfile: (activeProfile, permissions, newToken) => {
            try {
                localStorage.setItem('app_base_active_profile', JSON.stringify(activeProfile));
                localStorage.setItem('app_base_permissions', JSON.stringify(permissions));
                if (newToken) {
                    localStorage.setItem('app_base_token', newToken);
                }
            } catch (e) {
                console.error('Failed to save active profile state to localStorage:', e);
            }
            set((state) => ({
                token: newToken || state.token,
                activeProfile,
                permissions,
                user: state.user
                    ? {
                          ...state.user,
                          profileId: activeProfile.id,
                          profileName: activeProfile.name,
                      }
                    : null,
            }));
        },

        logout: () => {
            try {
                localStorage.removeItem('app_base_token');
                localStorage.removeItem('app_base_user');
                localStorage.removeItem('app_base_permissions');
                localStorage.removeItem('app_base_active_profile');
                localStorage.removeItem('app_base_available_profiles');
                sessionStorage.removeItem('redirect_after_login');
                sessionStorage.setItem('explicit_logout', 'true');
            } catch (e) {
                console.error('Failed to clear auth state from localStorage:', e);
            }
            set({
                token: null,
                user: null,
                permissions: [],
                activeProfile: null,
                availableProfiles: [],
                isAuthenticated: false,
            });
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

        syncSession: (userData, newPermissions, activeProfile, availableProfiles) => {
            set((state) => {
                const updatedUser = state.user ? { ...state.user, ...userData } : (userData as User);
                const updatedPermissions = newPermissions ?? state.permissions;
                const updatedActiveProfile = activeProfile !== undefined ? activeProfile : state.activeProfile;
                const updatedAvailableProfiles = availableProfiles !== undefined ? availableProfiles : state.availableProfiles;

                try {
                    localStorage.setItem('app_base_user', JSON.stringify(updatedUser));
                    localStorage.setItem('app_base_permissions', JSON.stringify(updatedPermissions));
                    if (updatedActiveProfile) {
                        localStorage.setItem('app_base_active_profile', JSON.stringify(updatedActiveProfile));
                    }
                    if (updatedAvailableProfiles) {
                        localStorage.setItem('app_base_available_profiles', JSON.stringify(updatedAvailableProfiles));
                    }
                } catch (e) {
                    console.error('Failed to sync session to localStorage:', e);
                }

                return {
                    user: updatedUser,
                    permissions: updatedPermissions,
                    activeProfile: updatedActiveProfile,
                    availableProfiles: updatedAvailableProfiles,
                };
            });
        },
    };
});

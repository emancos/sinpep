import { create } from 'zustand';
import { isTokenExpired } from '../utils/token';

export interface ActiveProfile {
    id: string;
    name: string;
    description?: string | null;
    isDefault?: boolean;
}

export interface ActiveHealthCenter {
    id: string;
    name: string;
    cnes?: string | null;
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
    isMunicipalRegulator?: boolean;
    sisregUsername?: string;
}

interface AuthState {
    token: string | null;
    user: User | null;
    permissions: string[];
    activeProfile: ActiveProfile | null;
    availableProfiles: ActiveProfile[];
    activeHealthCenter: ActiveHealthCenter | null;
    availableHealthCenters: ActiveHealthCenter[];
    isAuthenticated: boolean;
    login: (
        token: string,
        user: User,
        permissions: string[],
        activeProfile?: ActiveProfile | null,
        availableProfiles?: ActiveProfile[],
        activeHealthCenter?: ActiveHealthCenter | null,
        availableHealthCenters?: ActiveHealthCenter[]
    ) => void;
    selectProfile: (activeProfile: ActiveProfile, permissions: string[], token?: string) => void;
    selectHealthCenter: (healthCenter: ActiveHealthCenter, token?: string) => void;
    logout: () => void;
    updateUser: (user: Partial<User>) => void;
    syncSession: (
        user: Partial<User>,
        permissions?: string[],
        activeProfile?: ActiveProfile | null,
        availableProfiles?: ActiveProfile[],
        activeHealthCenter?: ActiveHealthCenter | null,
        availableHealthCenters?: ActiveHealthCenter[]
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
            localStorage.removeItem('app_base_active_health_center');
            localStorage.removeItem('app_base_available_health_centers');
        } catch {
            // Ignora erro de storage
        }
    }

    const validToken = !isExpired ? savedToken : null;
    const savedUser = validToken ? getSavedItem('app_base_user') : null;
    const savedPermissions = validToken ? getSavedItem('app_base_permissions') : null;
    const savedActiveProfile = validToken ? getSavedItem('app_base_active_profile') : null;
    const savedAvailableProfiles = validToken ? getSavedItem('app_base_available_profiles') : null;
    const savedActiveHealthCenter = validToken ? getSavedItem('app_base_active_health_center') : null;
    const savedAvailableHealthCenters = validToken ? getSavedItem('app_base_available_health_centers') : null;

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

    let parsedActiveHealthCenter: ActiveHealthCenter | null = null;
    if (savedActiveHealthCenter) {
        try {
            parsedActiveHealthCenter = JSON.parse(savedActiveHealthCenter);
        } catch {
            parsedActiveHealthCenter = null;
        }
    }

    let parsedAvailableHealthCenters: ActiveHealthCenter[] = [];
    if (savedAvailableHealthCenters) {
        try {
            parsedAvailableHealthCenters = JSON.parse(savedAvailableHealthCenters);
        } catch {
            parsedAvailableHealthCenters = [];
        }
    }

    return {
        token: validToken,
        user: parsedUser,
        permissions: parsedPermissions,
        activeProfile: parsedActiveProfile,
        availableProfiles: parsedAvailableProfiles,
        activeHealthCenter: parsedActiveHealthCenter,
        availableHealthCenters: parsedAvailableHealthCenters,
        isAuthenticated: !!validToken,

        login: (token, user, permissions, activeProfile, availableProfiles, activeHealthCenter, availableHealthCenters) => {
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
                if (activeHealthCenter) {
                    localStorage.setItem('app_base_active_health_center', JSON.stringify(activeHealthCenter));
                }
                if (availableHealthCenters) {
                    localStorage.setItem('app_base_available_health_centers', JSON.stringify(availableHealthCenters));
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
                activeHealthCenter: activeHealthCenter || null,
                availableHealthCenters: availableHealthCenters || [],
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

        selectHealthCenter: (healthCenter, newToken) => {
            try {
                localStorage.setItem('app_base_active_health_center', JSON.stringify(healthCenter));
                if (newToken) {
                    localStorage.setItem('app_base_token', newToken);
                }
            } catch (e) {
                console.error('Failed to save active health center to localStorage:', e);
            }
            set((state) => ({
                token: newToken || state.token,
                activeHealthCenter: healthCenter,
                user: state.user
                    ? {
                          ...state.user,
                          healthCenterId: healthCenter.id,
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
                localStorage.removeItem('app_base_active_health_center');
                localStorage.removeItem('app_base_available_health_centers');
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
                activeHealthCenter: null,
                availableHealthCenters: [],
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

        syncSession: (userData, newPermissions, activeProfile, availableProfiles, activeHealthCenter, availableHealthCenters) => {
            set((state) => {
                const updatedUser = state.user ? { ...state.user, ...userData } : (userData as User);
                const updatedPermissions = newPermissions ?? state.permissions;
                const updatedActiveProfile = activeProfile !== undefined ? activeProfile : state.activeProfile;
                const updatedAvailableProfiles = availableProfiles !== undefined ? availableProfiles : state.availableProfiles;
                const updatedActiveHealthCenter = activeHealthCenter !== undefined ? activeHealthCenter : state.activeHealthCenter;
                const updatedAvailableHealthCenters = availableHealthCenters !== undefined ? availableHealthCenters : state.availableHealthCenters;

                try {
                    localStorage.setItem('app_base_user', JSON.stringify(updatedUser));
                    localStorage.setItem('app_base_permissions', JSON.stringify(updatedPermissions));
                    if (updatedActiveProfile) {
                        localStorage.setItem('app_base_active_profile', JSON.stringify(updatedActiveProfile));
                    }
                    if (updatedAvailableProfiles) {
                        localStorage.setItem('app_base_available_profiles', JSON.stringify(updatedAvailableProfiles));
                    }
                    if (updatedActiveHealthCenter) {
                        localStorage.setItem('app_base_active_health_center', JSON.stringify(updatedActiveHealthCenter));
                    }
                    if (updatedAvailableHealthCenters) {
                        localStorage.setItem('app_base_available_health_centers', JSON.stringify(updatedAvailableHealthCenters));
                    }
                } catch (e) {
                    console.error('Failed to sync session to localStorage:', e);
                }

                return {
                    user: updatedUser,
                    permissions: updatedPermissions,
                    activeProfile: updatedActiveProfile,
                    availableProfiles: updatedAvailableProfiles,
                    activeHealthCenter: updatedActiveHealthCenter,
                    availableHealthCenters: updatedAvailableHealthCenters,
                };
            });
        },
    };
});

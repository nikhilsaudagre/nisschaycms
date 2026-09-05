'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { ClinicRegisterInput, LoginInput, ResetPasswordInput } from '@/lib/validations';
import { User, AuthState } from '@/types';
import { useQueryClient } from '@tanstack/react-query';

interface AuthContextType extends AuthState {
  login: (input: LoginInput) => Promise<User>;
  registerClinic: (input: ClinicRegisterInput) => Promise<User>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<string>;
  resetPassword: (input: ResetPasswordInput) => Promise<void>;
  updateUser: (updatedData: Partial<User>) => void;
  refreshUser: () => Promise<User>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: true,
  });
  const router = useRouter();

  useEffect(() => {
    // 1. Initialize authentication from localStorage instantly
    const initAuth = () => {
      const storedAccessToken = localStorage.getItem('accessToken');
      const storedRefreshToken = localStorage.getItem('refreshToken');
      const storedUser = localStorage.getItem('user');

      if (storedAccessToken && storedRefreshToken && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser) as User;
          // Set state immediately without waiting for server response
          setState({
            user: parsedUser,
            accessToken: storedAccessToken,
            refreshToken: storedRefreshToken,
            isAuthenticated: true,
            isLoading: false,
          });

          // Verify current session with server asynchronously in the background
          apiClient.get('/users/me')
            .then((response) => {
              const verifiedUser = response.data as User;
              localStorage.setItem('user', JSON.stringify(verifiedUser));
              setState((prev) => ({
                ...prev,
                user: verifiedUser,
              }));
            })
            .catch((error: any) => {
              console.warn("Session verification failed: " + (error?.message || error));
              if (error?.response?.status === 401) {
                handleClientLogout();
              }
            });
        } catch (error: any) {
          console.error("Failed to parse stored user", error);
          handleClientLogout();
        }
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    };

    initAuth();

    // 2. Listen to auto-logout events from API Interceptors
    const handleLogoutEvent = () => {
      handleClientLogout();
    };

    // 3. Listen to cross-component & cross-tab user profile update events
    const handleUserUpdatedEvent = (event: Event) => {
      const customEvent = event as CustomEvent<User>;
      if (customEvent.detail) {
        setState((prev) => ({ ...prev, user: customEvent.detail }));
      }
    };

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'user' && e.newValue) {
        try {
          const updated = JSON.parse(e.newValue) as User;
          setState((prev) => ({ ...prev, user: updated }));
        } catch {}
      }
    };

    window.addEventListener('auth:logout', handleLogoutEvent);
    window.addEventListener('auth:user-updated', handleUserUpdatedEvent);
    window.addEventListener('storage', handleStorageEvent);

    return () => {
      window.removeEventListener('auth:logout', handleLogoutEvent);
      window.removeEventListener('auth:user-updated', handleUserUpdatedEvent);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, []);

  const handleClientLogout = () => {
    queryClient.clear();
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
    router.push('/login');
  };

  const updateUser = (updatedData: Partial<User>) => {
    setState((prev) => {
      if (!prev.user) return prev;
      const newUser: User = { ...prev.user, ...updatedData };
      localStorage.setItem('user', JSON.stringify(newUser));
      window.dispatchEvent(new CustomEvent('auth:user-updated', { detail: newUser }));
      return { ...prev, user: newUser };
    });
  };

  const refreshUser = async (): Promise<User> => {
    try {
      const response = await apiClient.get('/users/me');
      const verifiedUser = response.data as User;
      localStorage.setItem('user', JSON.stringify(verifiedUser));
      setState((prev) => ({ ...prev, user: verifiedUser }));
      window.dispatchEvent(new CustomEvent('auth:user-updated', { detail: verifiedUser }));
      return verifiedUser;
    } catch (err) {
      console.error('Failed to refresh user profile', err);
      throw err;
    }
  };

  const login = async (input: LoginInput): Promise<User> => {
    queryClient.clear();
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      const response = await apiClient.post('/auth/login', input);
      const { accessToken, refreshToken, userId, name, email, role, clinicId, clinicName, profilePictureUrl } = response.data;

      const user: User = { id: userId, name, email, role, clinicId, clinicName, profilePictureUrl };

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));

      setState({
        user,
        accessToken,
        refreshToken,
        isAuthenticated: true,
        isLoading: false,
      });

      return user;
    } catch (error: any) {
      setState((prev) => ({ ...prev, isLoading: false }));
      const msg = error.response?.data?.message || error.response?.data?.error || (error.code === 'ERR_NETWORK' ? 'Unable to reach backend server. Please ensure the backend is active.' : error.message) || 'Invalid credentials';
      throw msg;
    }
  };

  const registerClinic = async (input: ClinicRegisterInput): Promise<User> => {
    queryClient.clear();
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      const response = await apiClient.post('/auth/register-clinic', input);
      const { accessToken, refreshToken, userId, name, email, role, clinicId, clinicName, profilePictureUrl } = response.data;

      const user: User = { id: userId, name, email, role, clinicId, clinicName, profilePictureUrl };

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));

      setState({
        user,
        accessToken,
        refreshToken,
        isAuthenticated: true,
        isLoading: false,
      });

      return user;
    } catch (error: any) {
      setState((prev) => ({ ...prev, isLoading: false }));
      const msg = error.response?.data?.message || error.response?.data?.error || (error.code === 'ERR_NETWORK' ? 'Unable to reach backend server. Please ensure the backend is active.' : error.message) || 'Failed to register clinic';
      throw msg;
    }
  };

  const logout = async () => {
    const currentRefreshToken = state.refreshToken || localStorage.getItem('refreshToken');
    
    // 1. Immediately log out user on client side for instant 0ms UX response
    handleClientLogout();

    // 2. Invalidate refresh token on server in the background
    if (currentRefreshToken) {
      apiClient.post('/auth/logout', { refreshToken: currentRefreshToken }).catch((err) => {
        console.warn("Background server logout completed with warning", err?.message || err);
      });
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      const response = await apiClient.post('/auth/forgot-password', { email });
      return response.data.message; // Contains the reset OTP code in dev logs/response
    } catch (error: any) {
      throw error.response?.data?.message || 'Failed to request password reset';
    }
  };

  const resetPassword = async (input: ResetPasswordInput) => {
    try {
      await apiClient.post('/auth/reset-password', input);
      router.push('/login');
    } catch (error: any) {
      throw error.response?.data?.message || 'Failed to reset password';
    }
  };

  return (
    <AuthContext.Provider value={{ ...state, login, registerClinic, logout, forgotPassword, resetPassword, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

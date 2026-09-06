import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import apiClient, { AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY } from '../api/client';
import { User, StudentProfile, AuthState } from '../types';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (studentData: any) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore authenticated session on app launch
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
        if (token) {
          setAccessToken(token);
          // Fetch current profile from backend
          const response = await apiClient.get('/auth/me');
          if (response.data.success) {
            setUser({
              id: response.data.data.id,
              email: response.data.data.email,
              role: response.data.data.role,
              isActive: response.data.data.isActive,
            });
            setProfile(response.data.data.studentProfile || null);
          }
        }
      } catch (error) {
        console.warn('Session restoration failed:', error);
        await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      if (response.data.success) {
        const { user: loggedInUser, profile: loggedInProfile, accessToken: token, refreshToken } =
          response.data.data;

        await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);

        setUser(loggedInUser);
        setProfile(loggedInProfile);
        setAccessToken(token);
        return { success: true };
      }
      return { success: false, message: response.data.message || 'Login failed' };
    } catch (error: any) {
      const message =
        error.response?.data?.message || 'Unable to connect to server. Please try again.';
      return { success: false, message };
    }
  };

  const register = async (studentData: any) => {
    try {
      const response = await apiClient.post('/auth/register', studentData);
      if (response.data.success) {
        return { success: true, message: response.data.message };
      }
      return { success: false, message: response.data.message || 'Registration failed' };
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.error?.[0]?.message ||
        'Registration failed. Please check your details.';
      return { success: false, message };
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (e) {
      // Ignore network errors on logout
    } finally {
      await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      setUser(null);
      setProfile(null);
      setAccessToken(null);
    }
  };

  const refreshProfile = async () => {
    try {
      const response = await apiClient.get('/auth/me');
      if (response.data.success) {
        setUser({
          id: response.data.data.id,
          email: response.data.data.email,
          role: response.data.data.role,
          isActive: response.data.data.isActive,
        });
        setProfile(response.data.data.studentProfile || null);
      }
    } catch (error) {
      console.warn('Profile refresh failed:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        accessToken,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

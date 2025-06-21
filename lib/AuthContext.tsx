'use client';
import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { validateToken, loginUser, logoutUser } from './supabase';
type User = {
  id: number;
  username: string;
  email: string;
  role: string;
  avatar_url?: string;
};
type AuthContextType = {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (avatarUrl?: string, displayName?: string) => void;
};
const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('auth_token');
        if (!token) {
          setUser(null);
          return;
        }
        const { user, error } = await validateToken(token);
        if (error || !user) {
          localStorage.removeItem('auth_token');
          setUser(null);
          setError(error);
        } else {
          setUser(user);
        }
      } catch (error: any) {
        console.error('Auth kontrolünde hata:', error);
        setUser(null);
        setError(error.message || 'Bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);
  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const { user, token, error } = await loginUser(email, password);
      if (error || !user || !token) {
        throw new Error(error || 'Giriş yapılırken bir hata oluştu');
      }
      localStorage.setItem('auth_token', token);
      setUser(user);
      window.dispatchEvent(new Event('auth_state_change'));
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  const logout = async () => {
    setLoading(true);
    setError(null);
    try {
      await logoutUser();
        localStorage.removeItem('auth_token');
        setUser(null);
        window.dispatchEvent(new Event('auth_state_change'));
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateUserProfile = (avatarUrl?: string, displayName?: string) => {
    if (user) {
      setUser({
        ...user,
        avatar_url: avatarUrl || user.avatar_url,
        username: displayName || user.username
      });
    }
  };
  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, updateUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth hook must be used within an AuthProvider');
  }
  return context;
}; 
import { API_URL } from '../config';
import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Permissions Matrix matching backend definition
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  ADMIN: [
    'billing.create', 'billing.view', 'billing.edit', 'billing.cancel',
    'payment.create', 'payment.view', 'payment.refund',
    'inventory.create', 'inventory.edit', 'inventory.sell', 'inventory.return',
    'metalRate.view', 'metalRate.edit',
    'reports.view', 'reports.export',
    'users.view', 'users.create', 'users.edit',
    'settings.manage', 'audit.view'
  ],
  MANAGER: [
    'billing.create', 'billing.view', 'billing.edit', 'billing.cancel',
    'payment.create', 'payment.view',
    'inventory.create', 'inventory.edit', 'inventory.sell', 'inventory.return',
    'metalRate.view', 'metalRate.edit',
    'reports.view', 'reports.export',
    'users.view'
  ],
  CASHIER: [
    'billing.create', 'billing.view',
    'payment.create', 'payment.view',
    'inventory.sell',
    'metalRate.view'
  ]
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if token and user exist in storage
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch(API_URL + '/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Login failed');
    }

    const data = await res.json();
    
    // Store credentials in state & localStorage
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const hasPermission = (permission: string): boolean => {
    if (!user || !user.role) return false;
    const permissions = ROLE_PERMISSIONS[user.role as UserRole] || [];
    return permissions.includes(permission);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        loading,
        login,
        logout,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;

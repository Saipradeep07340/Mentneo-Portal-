import React, { createContext, useContext, useState, useEffect } from 'react';
import { employeeApi } from '../api/employeeApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('employeeToken'));
  const [user, setUser] = useState(() => {
    const cached = localStorage.getItem('employeeUser');
    return cached ? JSON.parse(cached) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verifyAuth() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const data = await employeeApi.getCurrentUser();
        setUser(data.user);
        localStorage.setItem('employeeUser', JSON.stringify(data.user));
      } catch (err) {
        console.warn('Session verification failed, logging out:', err.message);
        localStorage.removeItem('employeeToken');
        localStorage.removeItem('employeeUser');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    verifyAuth();
  }, [token]);

  const login = async (email, password) => {
    const data = await employeeApi.login(email, password);
    localStorage.setItem('employeeToken', data.token);
    localStorage.setItem('employeeUser', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    try {
      await employeeApi.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('employeeToken');
      localStorage.removeItem('employeeUser');
      setToken(null);
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const data = await employeeApi.getCurrentUser();
      setUser(data.user);
      localStorage.setItem('employeeUser', JSON.stringify(data.user));
      return data.user;
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ token, user, loading, login, logout, refreshUser, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

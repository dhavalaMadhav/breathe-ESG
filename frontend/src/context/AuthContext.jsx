import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Restore authenticated session when application mounts
  useEffect(() => {
    const checkSession = async () => {
      const token = localStorage.getItem('esg_access_token');
      const savedUser = localStorage.getItem('esg_user');
      
      if (token && savedUser) {
        try {
          setUser(JSON.parse(savedUser));
          // Validate with server
          const { data } = await api.get('/auth/profile');
          setUser(data);
          localStorage.setItem('esg_user', JSON.stringify(data));
        } catch (err) {
          console.error('Session validation failed. Falling back to clean logout.', err);
          logout();
        }
      }
      setLoading(false);
    };

    checkSession();

    // Catch silent refresh failures and clean up
    const handleAuthExpired = () => {
      setUser(null);
    };

    window.addEventListener('auth-expired', handleAuthExpired);
    return () => window.removeEventListener('auth-expired', handleAuthExpired);
  }, []);

  const login = async (email, password) => {
    setError(null);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      
      localStorage.setItem('esg_access_token', data.accessToken);
      localStorage.setItem('esg_refresh_token', data.refreshToken);
      localStorage.setItem('esg_user', JSON.stringify(data.user));
      
      setUser(data.user);
      return data.user;
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Authentication credentials rejected.';
      setError(errMsg);
      throw new Error(errMsg);
    }
  };

  const signup = async (signupData) => {
    setError(null);
    try {
      const { data } = await api.post('/auth/signup', signupData);
      
      localStorage.setItem('esg_access_token', data.accessToken);
      localStorage.setItem('esg_refresh_token', data.refreshToken);
      localStorage.setItem('esg_user', JSON.stringify(data.user));
      
      setUser(data.user);
      return data.user;
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to complete registration.';
      setError(errMsg);
      throw new Error(errMsg);
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.warn('Logout API invocation failed, completing client clearance.', err);
    } finally {
      localStorage.removeItem('esg_access_token');
      localStorage.removeItem('esg_refresh_token');
      localStorage.removeItem('esg_user');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, signup, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

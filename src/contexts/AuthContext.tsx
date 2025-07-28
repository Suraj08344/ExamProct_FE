import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContextType } from '../types';
import { authAPI } from '../services/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

function decodeJwt(token: string) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored user data and token on app load
    const token = localStorage.getItem('token');
    if (token) {
      // Verify token and get current user
      authAPI.getCurrentUser()
        .then(response => {
          if (response.success) {
            setUser(response.data);
          } else {
            // Token is invalid, remove it
            authAPI.logout();
          }
        })
        .catch(() => {
          // Token is invalid, remove it
          authAPI.logout();
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await authAPI.login({ email, password });
      
      if (response.success) {
        setUser(response.data);
        
        // Check if this is first-time login and redirect accordingly
        if (response.data.isFirstLogin) {
          // Redirect to first-time profile page
          window.location.href = '/first-time-profile';
        } else if (response.data.role === 'university') {
          // Decode token and check role
          const decoded = decodeJwt(response.data.token);
          if (!decoded || decoded.role !== 'university') {
            alert('You must log in as a University Admin.');
            logout();
            return;
          }
          // Redirect university users to their dashboard
          window.location.href = '/dashboard/university';
        } else {
          // Redirect regular users to their dashboard
          window.location.href = '/dashboard';
        }
        
        return response.data;
      } else {
        throw new Error(response.error || 'Login failed');
      }
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string, role: string) => {
    setLoading(true);
    try {
      const response = await authAPI.register({ email, password, name, role });
      
      if (response.success) {
        setUser(response.data);
        return response.data;
      } else {
        throw new Error(response.error || 'Registration failed');
      }
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authAPI.logout();
    setUser(null);
  };

  const updateUser = (userData: User) => {
    setUser(userData);
  };

  const value: AuthContextType = {
    user,
    login,
    register,
    logout,
    updateUser,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 
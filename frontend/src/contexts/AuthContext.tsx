import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { turboFCLService } from '../services/turboFCLService';

interface User {
  id: string;
  email: string;
  companyName: string;
  role: string;
  securityClearance?: string;
  dcsaFacilityId?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

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

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && !!token;

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem('turbofcl_token');
        const storedUser = localStorage.getItem('turbofcl_user');

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          
          // Verify token is still valid
          try {
            await turboFCLService.verifyToken(storedToken);
          } catch (error) {
            // Token is invalid, clear auth state
            localStorage.removeItem('turbofcl_token');
            localStorage.removeItem('turbofcl_user');
            setToken(null);
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      const authResult = await turboFCLService.authenticate(email, password);
      
      const userInfo = {
        id: authResult.user.sub,
        email: authResult.user.email,
        companyName: authResult.user['custom:company_name'] || '',
        role: authResult.user['custom:role'] || 'FSO',
        securityClearance: authResult.user['custom:security_clearance'],
        dcsaFacilityId: authResult.user['custom:dcsa_facility_id']
      };

      setToken(authResult.accessToken);
      setUser(userInfo);

      // Store in localStorage
      localStorage.setItem('turbofcl_token', authResult.accessToken);
      localStorage.setItem('turbofcl_user', JSON.stringify(userInfo));

      // Set default authorization header
      turboFCLService.setAuthToken(authResult.accessToken);

    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    
    // Clear localStorage
    localStorage.removeItem('turbofcl_token');
    localStorage.removeItem('turbofcl_user');
    localStorage.removeItem('turbofcl_refresh_token');
    
    // Clear service auth token
    turboFCLService.setAuthToken(null);
  };

  const refreshToken = async () => {
    try {
      const refreshToken = localStorage.getItem('turbofcl_refresh_token');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const authResult = await turboFCLService.refreshToken(refreshToken);
      
      setToken(authResult.accessToken);
      localStorage.setItem('turbofcl_token', authResult.accessToken);
      
      // Update service auth token
      turboFCLService.setAuthToken(authResult.accessToken);

    } catch (error) {
      console.error('Token refresh error:', error);
      logout(); // Force logout if refresh fails
      throw error;
    }
  };

  // Set up token refresh interval
  useEffect(() => {
    if (token) {
      turboFCLService.setAuthToken(token);
      
      // Set up automatic token refresh (every 50 minutes)
      const refreshInterval = setInterval(() => {
        refreshToken().catch(() => {
          // Refresh failed, user will be logged out
        });
      }, 50 * 60 * 1000);

      return () => clearInterval(refreshInterval);
    }
  }, [token]);

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated,
    login,
    logout,
    refreshToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
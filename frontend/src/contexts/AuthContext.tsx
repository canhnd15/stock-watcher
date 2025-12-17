import React, { createContext, useState, useContext, useEffect } from 'react';
import Keycloak from 'keycloak-js';
import { keycloakConfig } from '@/lib/keycloak';
import { setTokenGetter } from '@/lib/api';

interface User {
  id?: number;
  username: string;
  email: string;
  role: 'NORMAL' | 'VIP' | 'ADMIN';
  enabled: boolean;
  emailVerified?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: () => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  hasRole: (roles: string[]) => boolean;
  isLoading: boolean;
  keycloak: Keycloak | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [keycloak, setKeycloak] = useState<Keycloak | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize Keycloak
    const kc = new Keycloak({
      url: keycloakConfig.url,
      realm: keycloakConfig.realm,
      clientId: keycloakConfig.clientId,
    });

    kc.init({
      onLoad: 'check-sso',
      checkLoginIframe: false,
      pkceMethod: 'S256',
    }).then((authenticated) => {
      setKeycloak(kc);
      if (authenticated) {
        setToken(kc.token || null);
        extractUserFromToken(kc);
      }
      // Set token getter for API client
      setTokenGetter(() => kc.token || null);
      setIsLoading(false);
    }).catch((error) => {
      console.error('Failed to initialize Keycloak:', error);
      setIsLoading(false);
    });

    // Set up event listeners
    kc.onTokenExpired = () => {
      kc.updateToken(30).then((refreshed) => {
        if (refreshed) {
          setToken(kc.token || null);
          extractUserFromToken(kc);
          setTokenGetter(() => kc.token || null);
        } else {
          console.warn('Token not refreshed, valid for: ' + kc.tokenParsed?.exp + ' seconds');
        }
      }).catch(() => {
        console.error('Failed to refresh token');
        logout();
      });
    };

    kc.onAuthSuccess = () => {
      setToken(kc.token || null);
      extractUserFromToken(kc);
      setTokenGetter(() => kc.token || null);
    };

    kc.onAuthError = () => {
      console.error('Keycloak authentication error');
      setUser(null);
      setToken(null);
      setTokenGetter(() => null);
    };

    kc.onAuthLogout = () => {
      setUser(null);
      setToken(null);
      setTokenGetter(() => null);
    };
  }, []);

  const extractUserFromToken = (kc: Keycloak) => {
    if (!kc.tokenParsed) {
      setUser(null);
      return;
    }

    const token = kc.tokenParsed;
    const username = token.preferred_username as string;
    const email = token.email as string;
    const emailVerified = token.email_verified as boolean | undefined;

    // Extract roles from token
    let role: 'NORMAL' | 'VIP' | 'ADMIN' = 'NORMAL';
    const realmAccess = token.realm_access as { roles?: string[] } | undefined;
    const roles = realmAccess?.roles || [];
    
    if (roles.includes('ADMIN')) {
      role = 'ADMIN';
    } else if (roles.includes('VIP')) {
      role = 'VIP';
    }

    setUser({
      username,
      email,
      role,
      enabled: true,
      emailVerified,
    });
  };

  const fetchCurrentUser = async () => {
    if (!keycloak || !keycloak.authenticated || !keycloak.token) {
      setUser(null);
      return;
    }

    try {
      // Ensure token is fresh
      await keycloak.updateToken(30);
      setToken(keycloak.token || null);
      extractUserFromToken(keycloak);
    } catch (error) {
      console.error('Failed to update token:', error);
      logout();
    }
  };

  const login = async () => {
    if (!keycloak) {
      throw new Error('Keycloak not initialized');
    }
    await keycloak.login();
  };

  const register = async (username: string, email: string, password: string) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Registration failed');
    }

    // After successful registration, redirect to login
    // User will need to login via Keycloak
  };

  const logout = () => {
    if (keycloak) {
      keycloak.logout();
    }
    setUser(null);
    setToken(null);
  };

  const hasRole = (roles: string[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      register,
      logout,
      isAuthenticated: !!user && !!keycloak?.authenticated,
      hasRole,
      isLoading,
      keycloak,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

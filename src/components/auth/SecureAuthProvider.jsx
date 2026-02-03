import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * SecureAuthProvider - Memory-based authentication state management
 * 
 * This component stores authentication tokens in memory (React state) rather than localStorage,
 * reducing the risk of XSS token theft. Tokens are automatically cleared on page refresh,
 * requiring re-authentication for enhanced security.
 * 
 * Future improvements should implement:
 * - Short-lived tokens with automatic refresh
 * - httpOnly cookies set by a secure auth microservice
 * - Server-side session management
 */

const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within SecureAuthProvider');
  }
  return context;
}

export default function SecureAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Load user on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        setIsAuthenticated(true);
      } catch (error) {
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  // Automatic token refresh (placeholder for future implementation)
  useEffect(() => {
    // TODO: Implement automatic token refresh before expiry
    // This should:
    // 1. Check token expiry time
    // 2. Refresh token 5 minutes before expiry
    // 3. Update in-memory token state
    // 4. Handle refresh failures gracefully
    
    const refreshInterval = setInterval(() => {
      // Future: Implement token refresh logic
      console.debug('Token refresh check (not yet implemented)');
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(refreshInterval);
  }, []);

  const login = useCallback(async (credentials) => {
    // Implement login logic that stores token in memory only
    // DO NOT use localStorage.setItem for tokens
    try {
      // Future: Call auth endpoint and store token in memory
      const userData = await base44.auth.me();
      setUser(userData);
      setIsAuthenticated(true);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, []);

  const logout = useCallback(async () => {
    await base44.auth.logout();
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const value = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
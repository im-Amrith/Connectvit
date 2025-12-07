import React, { createContext, useState, useContext, useEffect } from 'react';

// Create context
const AuthContext = createContext();

// Context provider component
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Check if user is already logged in from localStorage
  useEffect(() => {
    const checkAuthStatus = () => {
      try {
        const userData = localStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          // Validate the user data has required fields
          if (user && user.username) {
            setCurrentUser(user);
          } else {
            // Invalid user data, clear it
            localStorage.removeItem('user');
          }
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
        localStorage.removeItem('user');
      } finally {
        setLoading(false);
      }
    };
    
    // Small delay to allow components to mount
    setTimeout(() => {
      checkAuthStatus();
    }, 500);
  }, []);
  
  // Login function
  const login = async (username, password) => {
    try {
      console.log("Attempting login with:", { username, password });
      
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5010';
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      
      const data = await response.json();
      console.log("Login response:", data);
      
      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }
      
      // Save user to state and localStorage
      setCurrentUser(data.user);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  };
  
  // Logout function
  const logout = () => {
    console.log("Logging out user");
    setCurrentUser(null);
    localStorage.removeItem('user');
  };
  
  // Context value
  const value = {
    currentUser,
    loading,
    login,
    logout,
    isAuthenticated: !!currentUser
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook for using auth context
export const useAuth = () => {
  return useContext(AuthContext);
};

export default AuthContext; 

'use client';

import React, { createContext, useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/navigation';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const router = useRouter();

  // API URL
  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  // LOAD USER FROM LOCALSTORAGE
  useEffect(() => {
    const storedToken = localStorage.getItem('haqms_token');
    const storedUser = localStorage.getItem('haqms_user');

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (err) {
        console.error('Failed to parse stored user:', err);
        logout();
      }
    }

    setLoading(false);
  }, []);

  // LOGIN
  const login = async (email, password) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      // HANDLE LOGIN FAILURE
      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Invalid credentials',
        };
      }

      // SUCCESS LOGIN
      const receivedToken = data.token;
      const receivedUser = data.user;

      localStorage.setItem('haqms_token', receivedToken);
      localStorage.setItem(
        'haqms_user',
        JSON.stringify(receivedUser)
      );

      setToken(receivedToken);
      setUser(receivedUser);

      router.push('/dashboard');

      return {
        success: true,
      };
    } catch (err) {
      console.error('[AUTH-ERROR]', err);

      return {
        success: false,
        error: 'Server error. Please try again.',
      };
    } finally {
      setLoading(false);
    }
  };

  // REGISTER
  const register = async (
    name,
    email,
    password,
    role = 'receptionist'
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Registration failed',
        };
      }

      // AUTO LOGIN AFTER REGISTER
      return await login(email, password);
    } catch (err) {
      console.error('[REGISTER-ERROR]', err);

      return {
        success: false,
        error: 'Server error. Please try again.',
      };
    } finally {
      setLoading(false);
    }
  };

  // LOGOUT
  const logout = () => {
    localStorage.removeItem('haqms_token');
    localStorage.removeItem('haqms_user');

    setToken(null);
    setUser(null);

    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        error,
        login,
        register,
        logout,
        API_BASE_URL,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// CUSTOM HOOK
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used within an AuthProvider'
    );
  }

  return context;
};
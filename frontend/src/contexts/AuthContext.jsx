"use client";

/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';

const API_BASE = '/api/v1/auth';
const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Hydrate user from stored JWT on mount — only if session marker exists
  useEffect(() => {
    const token = localStorage.getItem('praja_token');
    // Skip /me if we know there's no session (avoids red 401 in console)
    if (!token) {
      setLoading(false);
      return;
    }
    fetch(`${API_BASE}/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then((res) => {
        if (!res.ok) {
          localStorage.removeItem('praja_token');
          localStorage.removeItem('praja_session');
          return Promise.reject(new Error('Token expired'));
        }
        return res.json();
      })
      .then((user) => {
        setCurrentUser({
          id: user.id,
          email: user.email,
          displayName: user.display_name || user.role,
          role: user.role,
        });
      })
      .catch(() => {
        setCurrentUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function signup(email, password, role, metadata) {
    const res = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        role,
        display_name: metadata?.name || metadata?.department || role,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      const err = new Error(data.detail || 'Registration failed');
      err.code = data.detail; // e.g. "email-already-in-use"
      throw err;
    }

    const user = {
      id: data.user.id,
      email: data.user.email,
      displayName: data.user.displayName || data.user.display_name || data.user.role,
      role: data.user.role,
    };
    localStorage.setItem('praja_token', data.access_token);
    localStorage.setItem('praja_session', '1');
    setCurrentUser(user);
    return { user };
  }

  async function login(email, password) {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      const err = new Error(data.detail || 'Login failed');
      err.code = data.detail; // e.g. "invalid-credentials"
      throw err;
    }

    const user = {
      id: data.user.id,
      email: data.user.email,
      displayName: data.user.displayName || data.user.display_name || data.user.role,
      role: data.user.role,
    };
    localStorage.setItem('praja_token', data.access_token);
    localStorage.setItem('praja_session', '1');
    setCurrentUser(user);
    return { user };
  }

  async function logout() {
    try {
      await fetch(`${API_BASE}/logout`, { method: 'POST' });
    } catch (e) {
      console.error("Logout request failed", e);
    }
    localStorage.removeItem('praja_token');
    localStorage.removeItem('praja_session');
    setCurrentUser(null);
  }

  const value = {
    currentUser,
    login,
    signup,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

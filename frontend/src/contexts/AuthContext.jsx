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

  useEffect(() => {
    const session = localStorage.getItem('aakar_session') || localStorage.getItem('praja_session');
    if (!session) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    fetch(`${API_BASE}/me`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) {
          localStorage.removeItem('aakar_session');
          localStorage.removeItem('praja_session');
          throw new Error('Token expired');
        }
        return res.json();
      })
      .then((user) => {
        setCurrentUser({
          id: user.id,
          email: user.email,
          displayName: user.display_name || user.role,
          role: (user.role || '').toUpperCase(),
          state_id: user.state_id,
          district_id: user.district_id,
          constituency_id: user.constituency_id,
          mandal_id: user.mandal_id,
          booth_id: user.booth_id,
        });
      })
      .catch(() => {
        localStorage.removeItem('aakar_session');
        localStorage.removeItem('praja_session');
        setCurrentUser(null);
      })
      .finally(() => {
        clearTimeout(timeoutId);
        setLoading(false);
      });
  }, []);

  async function signup(email, password, role, metadata, hierarchy = {}) {
    const res = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        role,
        display_name: metadata?.name || metadata?.department || role,
        state_id: hierarchy.state,
        district_id: hierarchy.district,
        constituency_id: hierarchy.constituency,
        mandal_id: hierarchy.mandal,
        booth_id: hierarchy.booth,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      const err = new Error(data.detail || 'Registration failed');
      err.code = data.detail;
      throw err;
    }

    localStorage.setItem('aakar_session', '1');
    if (data.access_token) {
      localStorage.setItem('token', data.access_token);
    }
    const userObj = {
      id: data.user.id,
      email: data.user.email,
      displayName: data.user.display_name || data.user.displayName || data.user.role,
      role: (data.user.role || '').toUpperCase(),
      state_id: data.user.state_id,
      district_id: data.user.district_id,
      constituency_id: data.user.constituency_id,
      mandal_id: data.user.mandal_id,
      booth_id: data.user.booth_id,
    };
    setCurrentUser(userObj);
    return { user: userObj };
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
      err.code = data.detail;
      throw err;
    }

    localStorage.setItem('aakar_session', '1');
    if (data.access_token) {
      localStorage.setItem('token', data.access_token);
    }
    const userObj = {
      id: data.user.id,
      email: data.user.email,
      displayName: data.user.display_name || data.user.displayName || data.user.role,
      role: (data.user.role || '').toUpperCase(),
      state_id: data.user.state_id,
      district_id: data.user.district_id,
      constituency_id: data.user.constituency_id,
      mandal_id: data.user.mandal_id,
      booth_id: data.user.booth_id,
    };
    setCurrentUser(userObj);
    return { user: userObj };
  }

  async function logout() {
    try {
      await fetch(`${API_BASE}/logout`, { method: 'POST' });
    } catch (e) {
      console.error("Logout request failed", e);
    }
    localStorage.removeItem('aakar_session');
    localStorage.removeItem('token');
    setCurrentUser(null);
  }

  const value = {
    currentUser,
    loading,
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

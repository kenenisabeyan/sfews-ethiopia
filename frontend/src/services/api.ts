import axios from 'axios';
import { API_BASE_URL, ENDPOINTS } from '../config/api';
import type { SystemHealth, TokenResponse, UserProfile } from '../types';

/**
 * Axios instance with automatic JWT injection and 401 handling.
 */
const api = axios.create({
  baseURL: API_BASE_URL,
});

// ── Request Interceptor: attach JWT to every request ──
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sfews_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response Interceptor: auto-logout on 401 ──
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('sfews_token');
      // Only redirect if not already on login page (avoids redirect loop)
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ── API Functions ──

export async function fetchHealth(): Promise<SystemHealth> {
  const res = await api.get<SystemHealth>(ENDPOINTS.HEALTH);
  return res.data;
}

export async function login(email: string, password: string): Promise<TokenResponse> {
  // FastAPI OAuth2 expects form-urlencoded, NOT JSON
  const params = new URLSearchParams();
  params.append('username', email);
  params.append('password', password);

  const res = await api.post<TokenResponse>(ENDPOINTS.LOGIN, params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return res.data;
}

export async function fetchCurrentUser(): Promise<UserProfile> {
  const res = await api.get<UserProfile>(ENDPOINTS.ME);
  return res.data;
}

export async function askAgent(query: string): Promise<string> {
  const res = await api.post<{ response: string }>(ENDPOINTS.CHAT_ASK, { query });
  return res.data.response;
}

export default api;

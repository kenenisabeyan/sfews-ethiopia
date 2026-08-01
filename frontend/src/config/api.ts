/**
 * Central API configuration.
 * All URLs derive from the single VITE_API_URL environment variable.
 */
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Convert http(s):// to ws(s):// for WebSocket connections
export const WS_URL = API_BASE_URL.replace(/^http/, 'ws');

export const ENDPOINTS = {
  // Public
  HEALTH: '/',
  WS_DASHBOARD: '/api/v1/ws/dashboard',
  SEED_SYSTEM: '/api/v1/system/seed',
  SEED_ADMIN: '/api/v1/auth/seed-admin',
  REGISTER_NODE: '/api/v1/nodes/register',

  // Auth
  LOGIN: '/api/v1/auth/login',
  ME: '/api/v1/auth/me',

  // Protected
  DASHBOARD: '/api/v1/dashboard/',
  CHAT_ASK: '/api/v1/chat/ask',
} as const;

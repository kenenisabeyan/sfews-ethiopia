import { useState, useEffect, useRef, useCallback } from 'react';
import { WS_URL, ENDPOINTS } from '../config/api';
import type { DashboardPayload } from '../types';

/**
 * WebSocket hook with exponential-backoff reconnection.
 * Connects to the backend dashboard stream and parses
 * every message as a full DashboardPayload.
 */
export function useWebSocket() {
  const [payload, setPayload] = useState<DashboardPayload | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const retryCount = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout>>();
  const unmounted = useRef(false);

  const connect = useCallback(() => {
    if (unmounted.current) return;

    const url = WS_URL + ENDPOINTS.WS_DASHBOARD;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      retryCount.current = 0;
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data: DashboardPayload = JSON.parse(event.data);
        setPayload(data);
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
      }
    };

    ws.onerror = () => {
      setIsConnected(false);
    };

    ws.onclose = () => {
      setIsConnected(false);
      wsRef.current = null;

      if (unmounted.current) return;

      // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
      const delay = Math.min(1000 * Math.pow(2, retryCount.current), 30000);
      retryCount.current += 1;
      retryTimer.current = setTimeout(connect, delay);
    };
  }, []);

  useEffect(() => {
    unmounted.current = false;
    connect();

    return () => {
      unmounted.current = true;
      clearTimeout(retryTimer.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return { payload, isConnected };
}

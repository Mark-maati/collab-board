import { useEffect, useRef, useCallback, useState } from 'react';
import { WSEvent, CursorPosition } from '../types';
import { WS_URL } from '../config';

interface UseWebSocketOptions {
  boardId: number;
  onMessage: (event: WSEvent) => void;
}

export function useWebSocket({ boardId, onMessage }: UseWebSocketOptions) {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState<string[]>([]);
  const [cursors, setCursors] = useState<Record<string, CursorPosition>>({});
  const reconnectTimeout = useRef<number>();

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    const token = localStorage.getItem('auth_token') || '';
    const socket = new WebSocket(`${WS_URL}/${boardId}?token=${encodeURIComponent(token)}`);

    socket.onopen = () => {
      setIsConnected(true);
    };

    socket.onmessage = (event) => {
      const data: WSEvent = JSON.parse(event.data);
      
      switch (data.type) {
        case 'connection_established':
          setActiveUsers(data.payload.active_users || []);
          setCursors(data.payload.cursors || {});
          break;
        case 'user_joined':
        case 'user_left':
          setActiveUsers(data.payload.active_users || []);
          break;
        case 'cursor_move':
          setCursors(prev => ({
            ...prev,
            [data.payload.user_id]: data.payload.cursor
          }));
          break;
        default:
          onMessage(data);
      }
    };

    socket.onclose = () => {
      setIsConnected(false);
      // Attempt reconnection
      reconnectTimeout.current = window.setTimeout(connect, 3000);
    };

    socket.onerror = () => {
      // Connection error - will trigger onclose for reconnection
    };

    ws.current = socket;
  }, [boardId, onMessage]);

  const sendCursorPosition = useCallback((position: CursorPosition) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'cursor_move',
        payload: position
      }));
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      ws.current?.close();
    };
  }, [connect]);

  return {
    isConnected,
    activeUsers,
    cursors,
    sendCursorPosition
  };
}

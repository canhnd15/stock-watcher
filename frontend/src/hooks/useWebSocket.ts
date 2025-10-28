import { useState, useEffect, useCallback, useRef } from 'react';
import { Client, Message } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

export interface SignalNotification {
  code: string;
  signalType: 'BUY' | 'SELL';
  reason: string;
  buyVolume: number;
  sellVolume: number;
  lastPrice: number;
  timestamp: string;
  score: number;
  priceChange: number;
}

export const useWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [signals, setSignals] = useState<SignalNotification[]>([]);
  const clientRef = useRef<Client | null>(null);
  const maxSignals = 15;

  const connect = useCallback(() => {
    if (clientRef.current?.active) {
      console.log('WebSocket already connected');
      return;
    }

    const socketFactory = () => new SockJS('/ws');

    const client = new Client({
      webSocketFactory: socketFactory as any,
      debug: (str) => {
        console.log('STOMP:', str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        console.log('✅ WebSocket Connected');
        setIsConnected(true);
        
        // Subscribe to signals
        client.subscribe('/topic/signals', (message: Message) => {
          try {
            const signal: SignalNotification = JSON.parse(message.body);
            console.log('📊 Signal received:', signal);
            
            setSignals((prev) => {
              const newSignals = [signal, ...prev];
              return newSignals.slice(0, maxSignals);
            });

            // Request browser notification permission if not granted
            if ('Notification' in window && Notification.permission === 'default') {
              Notification.requestPermission();
            }

            // Show browser notification
            if ('Notification' in window && Notification.permission === 'granted') {
              const icon = signal.signalType === 'BUY' ? '📈' : '📉';
              new Notification(`${icon} ${signal.signalType} Signal: ${signal.code}`, {
                body: signal.reason.substring(0, 150) + (signal.reason.length > 150 ? '...' : ''),
                icon: '/favicon.ico',
                tag: signal.code,
                requireInteraction: false,
              });
            }
          } catch (error) {
            console.error('Failed to parse signal:', error);
          }
        });
        
        console.log('📡 Subscribed to /topic/signals');
      },
      onStompError: (frame) => {
        console.error('❌ STOMP error:', frame.headers['message']);
        console.error('Details:', frame.body);
        setIsConnected(false);
      },
      onWebSocketClose: () => {
        console.log('🔌 WebSocket connection closed');
        setIsConnected(false);
      },
      onDisconnect: () => {
        console.log('⚠️ WebSocket Disconnected');
        setIsConnected(false);
      },
    });

    client.activate();
    clientRef.current = client;
  }, []);

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.deactivate();
      console.log('WebSocket disconnected manually');
    }
  }, []);

  const clearSignals = useCallback(() => {
    setSignals([]);
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    signals,
    clearSignals,
  };
};


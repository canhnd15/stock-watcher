import { useState, useEffect, useCallback, useRef } from 'react';
import { Client, Message } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuth } from '@/contexts/AuthContext';

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
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [signals, setSignals] = useState<SignalNotification[]>([]);
  const clientRef = useRef<Client | null>(null);
  const maxSignals = 15;

  const connect = useCallback(() => {
    if (clientRef.current?.active) {
      return;
    }

    const socketFactory = () => new SockJS('/ws');

    const client = new Client({
      webSocketFactory: socketFactory as any,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        setIsConnected(true);
        
        // Subscribe to user-specific signals if user is logged in
        if (user?.id) {
          const userTopic = `/topic/signals/user/${user.id}`;
          client.subscribe(userTopic, (message: Message) => {
            try {
              const signal: SignalNotification = JSON.parse(message.body);
              
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
        }
        
        // Also subscribe to general broadcast topic (for VN30 when no tracked stocks)
        client.subscribe('/topic/signals', (message: Message) => {
          try {
            const signal: SignalNotification = JSON.parse(message.body);
            
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
      },
      onStompError: (frame) => {
        console.error('❌ STOMP error:', frame.headers['message']);
        console.error('Details:', frame.body);
        setIsConnected(false);
      },
      onWebSocketClose: () => {
        setIsConnected(false);
      },
      onDisconnect: () => {
        setIsConnected(false);
      },
    });

    client.activate();
    clientRef.current = client;
  }, [user?.id]);

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.deactivate();
      clientRef.current = null;
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


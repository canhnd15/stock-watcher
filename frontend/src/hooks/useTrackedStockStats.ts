import { useState, useEffect, useCallback, useRef } from 'react';
import { Client, Message } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuth } from '@/contexts/AuthContext';

export interface TrackedStockStats {
  code: string;
  lowestPriceBuy?: number;
  highestPriceBuy?: number;
  lowestPriceSell?: number;
  highestPriceSell?: number;
  largestVolumeBuy?: number;
  largestVolumeSell?: number;
  lastUpdated?: string;
}

export const useTrackedStockStats = () => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [statsMap, setStatsMap] = useState<Map<string, TrackedStockStats>>(new Map());
  const clientRef = useRef<Client | null>(null);

  const connect = useCallback(() => {
    if (!user?.id) {
      console.log('[TrackedStockStats] No user ID, skipping connection');
      return;
    }

    if (clientRef.current?.active) {
      return;
    }

    const socketFactory = () => new SockJS('/ws');

    const client = new Client({
      webSocketFactory: socketFactory as any,
      debug: (str) => console.log('Tracked Stock Stats STOMP:', str),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        console.log('✅ Tracked Stock Stats Connected');
        setIsConnected(true);
        
        // Subscribe to user-specific stats topic
        const topic = `/topic/tracked-stocks-stats/user/${user.id}`;
        client.subscribe(topic, (message: Message) => {
          try {
            const statsUpdate: Record<string, TrackedStockStats> = JSON.parse(message.body);
            console.log('📊 Tracked Stock Stats Update:', statsUpdate);
            
            // Update stats map
            setStatsMap((prev) => {
              const newMap = new Map(prev);
              Object.entries(statsUpdate).forEach(([code, stats]) => {
                newMap.set(code, stats);
              });
              return newMap;
            });
          } catch (error) {
            console.error('Failed to parse tracked stock stats:', error);
          }
        });
        
        console.log(`📡 Subscribed to ${topic}`);
      },
      onStompError: (frame) => {
        console.error('❌ Tracked Stock Stats STOMP error:', frame);
        setIsConnected(false);
      },
      onWebSocketClose: () => {
        console.log('🔌 Tracked Stock Stats WebSocket closed');
        setIsConnected(false);
      },
      onDisconnect: () => {
        console.log('⚠️ Tracked Stock Stats Disconnected');
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

  useEffect(() => {
    if (user?.id) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [connect, disconnect, user?.id]);

  return {
    isConnected,
    statsMap,
    connect,
    disconnect,
  };
};


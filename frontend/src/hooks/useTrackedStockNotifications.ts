import { useState, useEffect, useCallback, useRef } from 'react';
import { Client, Message } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

export interface TrackedStockNotification {
  code: string;
  signalType: 'BUY' | 'SELL';
  score: number;
  reason: string;
  buyVolume: number;
  sellVolume: number;
  lastPrice: number;
  priceChange: number;
  timestamp: string;
  isBigSignal: boolean;
}

export const useTrackedStockNotifications = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<TrackedStockNotification[]>([]);
  const clientRef = useRef<Client | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        setPermissionGranted(true);
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          setPermissionGranted(permission === 'granted');
        });
      }
    }
  }, []);

  const showBrowserNotification = useCallback((notification: TrackedStockNotification) => {
    if (!permissionGranted) {
      return;
    }

    const icon = notification.signalType === 'BUY' ? '📈' : '📉';
    const title = `${icon} ${notification.signalType} SIGNAL: ${notification.code}`;
    const body = `Score: ${notification.score}/10 | Price: ${notification.lastPrice.toLocaleString()}\n${notification.reason.substring(0, 100)}`;

    try {
      // Create OS-level desktop notification
      const browserNotification = new Notification(title, {
        body: body,
        icon: '/favicon.ico',
        tag: `tracked-${notification.code}`, // Same tag replaces old notification for same stock
        requireInteraction: false, // Let OS handle auto-close
        badge: '/favicon.ico',
        silent: false, // Use system notification sound
        timestamp: Date.now(),
      });

      // Handle click - could open a specific page or just close
      browserNotification.onclick = () => {
        window.focus();
        browserNotification.close();
      };

      // Auto-close after 10 seconds to avoid clutter
      setTimeout(() => browserNotification.close(), 10000);
    } catch (error) {
      console.error('[TrackedNotifications] ❌ Error creating notification:', error);
    }

  }, [permissionGranted]);

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
        
        // Subscribe to tracked stock notifications topic
        client.subscribe('/topic/tracked-notifications', (message: Message) => {
          try {
            const notification: TrackedStockNotification = JSON.parse(message.body);
            
            // Add to notification list
            setNotifications((prev) => [notification, ...prev].slice(0, 20));
            
            // Show browser notification
            showBrowserNotification(notification);
            
          } catch (error) {
            console.error('Failed to parse tracked notification:', error);
          }
        });
      },
      onStompError: (frame) => {
        console.error('❌ Tracked Notifications STOMP error:', frame);
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
  }, [showBrowserNotification]);

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.deactivate();
    }
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const requestPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      setPermissionGranted(permission === 'granted');
      return permission === 'granted';
    }
    return permissionGranted;
  }, [permissionGranted]);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    isConnected,
    notifications,
    clearNotifications,
    permissionGranted,
    requestPermission,
  };
};


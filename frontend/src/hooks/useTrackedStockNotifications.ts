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
    console.log('[TrackedNotifications] Checking notification permission...');
    if ('Notification' in window) {
      console.log('[TrackedNotifications] Current permission:', Notification.permission);
      if (Notification.permission === 'granted') {
        console.log('[TrackedNotifications] ✅ Permission already granted');
        setPermissionGranted(true);
      } else if (Notification.permission !== 'denied') {
        console.log('[TrackedNotifications] Requesting permission...');
        Notification.requestPermission().then(permission => {
          console.log('[TrackedNotifications] Permission result:', permission);
          setPermissionGranted(permission === 'granted');
        });
      } else {
        console.log('[TrackedNotifications] ❌ Permission denied');
      }
    } else {
      console.log('[TrackedNotifications] ❌ Notification API not supported');
    }
  }, []);

  const showBrowserNotification = useCallback((notification: TrackedStockNotification) => {
    console.log('[TrackedNotifications] showBrowserNotification called for:', notification.code);
    console.log('[TrackedNotifications] Permission granted:', permissionGranted);
    
    if (!permissionGranted) {
      console.log('[TrackedNotifications] ❌ Permission not granted, skipping notification');
      return;
    }

    const icon = notification.signalType === 'BUY' ? '📈' : '📉';
    const title = `${icon} ${notification.signalType} SIGNAL: ${notification.code}`;
    const body = `Score: ${notification.score}/10 | Price: ${notification.lastPrice.toLocaleString()}\n${notification.reason.substring(0, 100)}`;

    console.log('[TrackedNotifications] Creating notification:', { title, body });

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

      console.log('[TrackedNotifications] ✅ Notification created successfully');

      // Handle click - could open a specific page or just close
      browserNotification.onclick = () => {
        console.log('[TrackedNotifications] Notification clicked');
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
      debug: (str) => console.log('Tracked Notifications STOMP:', str),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        console.log('✅ Tracked Stock Notifications Connected');
        setIsConnected(true);
        
        // Subscribe to tracked stock notifications topic
        client.subscribe('/topic/tracked-notifications', (message: Message) => {
          try {
            const notification: TrackedStockNotification = JSON.parse(message.body);
            console.log('🔔 Tracked Stock Notification:', notification);
            
            // Add to notification list
            setNotifications((prev) => [notification, ...prev].slice(0, 20));
            
            // Show browser notification
            showBrowserNotification(notification);
            
          } catch (error) {
            console.error('Failed to parse tracked notification:', error);
          }
        });
        
        console.log('📡 Subscribed to /topic/tracked-notifications');
      },
      onStompError: (frame) => {
        console.error('❌ Tracked Notifications STOMP error:', frame);
        setIsConnected(false);
      },
      onWebSocketClose: () => {
        console.log('🔌 Tracked Notifications WebSocket closed');
        setIsConnected(false);
      },
      onDisconnect: () => {
        console.log('⚠️ Tracked Notifications Disconnected');
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


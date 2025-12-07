import { useState, useEffect, useCallback, useRef } from 'react';
import { Client, Message } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuth } from '@/contexts/AuthContext';

export interface PriceAlertNotification {
  alertId: number;
  code: string;
  currentPrice: number;
  reachPrice?: number;
  dropPrice?: number;
  alertType: 'REACH' | 'DROP';
  timestamp: string;
  message: string;
}

export const usePriceAlertNotifications = () => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<PriceAlertNotification[]>([]);
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

  const showBrowserNotification = useCallback((notification: PriceAlertNotification) => {
    if (!permissionGranted) {
      return;
    }

    const icon = notification.alertType === 'REACH' ? '📈' : '📉';
    const title = `${icon} Price Alert: ${notification.code}`;
    const body = notification.message;

    try {
      // Create OS-level desktop notification
      const browserNotification = new Notification(title, {
        body: body,
        icon: '/favicon.ico',
        tag: `price-alert-${notification.alertId}`, // Same tag replaces old notification for same alert
        requireInteraction: false, // Let OS handle auto-close
        badge: '/favicon.ico',
        silent: false, // Use system notification sound
        timestamp: Date.now(),
      });

      // Handle click - could open price alerts page or just close
      browserNotification.onclick = () => {
        window.focus();
        browserNotification.close();
        // Optionally navigate to price alerts page
        // window.location.href = '/price-alerts';
      };

      // Auto-close after 10 seconds to avoid clutter
      setTimeout(() => browserNotification.close(), 10000);
    } catch (error) {
      console.error('[PriceAlertNotifications] ❌ Error creating notification:', error);
    }
  }, [permissionGranted]);

  const connect = useCallback(() => {
    if (!user?.id) {
      return;
    }

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
        
        // Subscribe to user-specific price alerts topic
        const topic = `/topic/price-alerts/user/${user.id}`;
        client.subscribe(topic, (message: Message) => {
          try {
            const notification: PriceAlertNotification = JSON.parse(message.body);
            
            // Add to notification list
            setNotifications((prev) => [notification, ...prev].slice(0, 20));
            
            // Show browser notification
            showBrowserNotification(notification);
            
            console.log('🔔 Price alert notification received:', notification.code, notification.alertType);
          } catch (error) {
            console.error('Failed to parse price alert notification:', error);
          }
        });
      },
      onStompError: (frame) => {
        console.error('❌ Price Alert Notifications STOMP error:', frame);
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
  }, [user?.id, showBrowserNotification]);

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.deactivate();
      clientRef.current = null;
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
    if (user?.id) {
      connect();
    }
    return () => disconnect();
  }, [connect, disconnect, user?.id]);

  return {
    isConnected,
    notifications,
    clearNotifications,
    permissionGranted,
    requestPermission,
  };
};


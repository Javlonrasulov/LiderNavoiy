import { useState, useEffect, useCallback } from 'react';
import { api, connectMessages } from '../api/client';
import { registerUnreadRefresh } from '../utils/messageNotificationState';

export function useMessagesUnreadCount(enabled: boolean) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const convs = await api.getConversations();
      setCount(convs.reduce((sum, c) => sum + c.unreadCount, 0));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    refresh();
    registerUnreadRefresh(refresh);

    let socket: Awaited<ReturnType<typeof connectMessages>> = null;
    connectMessages({
      onMessage: () => { refresh(); },
      onRead: () => { refresh(); },
      onDeleted: () => { refresh(); },
    }).then((s) => { socket = s; });

    return () => {
      registerUnreadRefresh(null);
      socket?.disconnect();
    };
  }, [enabled, refresh]);

  return count;
}

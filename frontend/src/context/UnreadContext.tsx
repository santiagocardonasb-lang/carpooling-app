import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import api from '../api';

interface UnreadCtx {
  unreadNotifs: number;
  unreadMsgs: number;
  total: number;
  clearNotifs: () => void;
  clearMsgs: () => void;
}

const Ctx = createContext<UnreadCtx>({
  unreadNotifs: 0,
  unreadMsgs: 0,
  total: 0,
  clearNotifs: () => {},
  clearMsgs: () => {},
});

export function UnreadProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [unreadMsgs, setUnreadMsgs] = useState(0);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [n, m] = await Promise.all([
        api.get('/notifications/unread-count'),
        api.get('/messages/unread-count'),
      ]);
      setUnreadNotifs(n.data.count);
      setUnreadMsgs(m.data.count);
    } catch {}
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadNotifs(0);
      setUnreadMsgs(0);
      return;
    }
    refresh();
    const i = setInterval(refresh, 6000);
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(i);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [isAuthenticated, refresh]);

  return (
    <Ctx.Provider value={{
      unreadNotifs,
      unreadMsgs,
      total: unreadNotifs + unreadMsgs,
      clearNotifs: () => setUnreadNotifs(0),
      clearMsgs: () => setUnreadMsgs(0),
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useUnread = () => useContext(Ctx);

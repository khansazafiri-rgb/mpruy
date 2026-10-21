import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import pb from '@/lib/pb';
import { api } from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [me, setMe] = useState(null);
  const [settings, setSettings] = useState(null);
  const [ready, setReady] = useState(false);

  const loadMe = useCallback(async () => {
    if (!pb.authStore.isValid) { setMe(null); return null; }
    try {
      const data = await api('me');
      setMe(data);
      return data;
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        pb.authStore.clear();
        setMe(null);
      }
      return null;
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try { setSettings(await api('public-settings')); } catch { setSettings({}); }
  }, []);

  useEffect(() => {
    (async () => {
      await loadSettings();
      if (pb.authStore.isValid) {
        try { await pb.collection('users').authRefresh(); } catch { pb.authStore.clear(); }
      }
      await loadMe();
      setReady(true);
    })();
    const off = pb.authStore.onChange(() => { if (!pb.authStore.isValid) setMe(null); });
    return () => off();
  }, [loadMe, loadSettings]);

  const login = useCallback(async (identity, password) => {
    await pb.collection('users').authWithPassword(identity.trim().toLowerCase(), password);
    return loadMe();
  }, [loadMe]);

  const logout = useCallback(() => {
    pb.authStore.clear();
    setMe(null);
  }, []);

  const value = useMemo(() => ({
    me, settings, ready, login, logout, refresh: loadMe, refreshSettings: loadSettings, setMe,
    isAdmin: me?.role === 'admin',
  }), [me, settings, ready, login, logout, loadMe, loadSettings]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

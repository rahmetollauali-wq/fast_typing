import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/client.js";
import { storage } from "../lib/storage.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => storage.getJSON("user"));
  const [ready, setReady] = useState(!storage.get("token"));

  // При загрузке проверяем, что токен ещё действует.
  useEffect(() => {
    if (!storage.get("token")) return;
    api.me()
      .then(({ user }) => {
        setUser(user);
        storage.setJSON("user", user);
      })
      .catch(() => {
        storage.set("token", null);
        storage.setJSON("user", null);
        setUser(null);
      })
      .finally(() => setReady(true));
  }, []);

  const applySession = useCallback(({ user, token }) => {
    storage.set("token", token);
    storage.setJSON("user", user);
    setUser(user);
  }, []);

  const login = useCallback(async (l, p) => applySession(await api.login(l, p)), [applySession]);
  const register = useCallback(async (l, p) => applySession(await api.register(l, p)), [applySession]);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      /* токен мог уже истечь */
    }
    storage.set("token", null);
    storage.setJSON("user", null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, ready, login, register, logout }), [user, ready, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

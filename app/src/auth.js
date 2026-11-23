import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, setToken } from "./api";

const KEY = "brewmap.token";
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [guest, setGuest] = useState(false); // browsing without an account
  const [loading, setLoading] = useState(true);

  // Restore the saved login. An expired or disabled account just falls back to the welcome screen.
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(KEY);
        if (saved) {
          setToken(saved);
          setUser((await api.me()).user);
        }
      } catch {
        setToken(null);
        await AsyncStorage.removeItem(KEY);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const finish = useCallback(async ({ token, user: u }) => {
    setToken(token);
    await AsyncStorage.setItem(KEY, token);
    setGuest(false);
    setUser(u);
  }, []);

  const value = useMemo(() => ({
    user, guest, loading,
    login: async (email, password) => finish(await api.login({ email, password })),
    register: async (body) => finish(await api.register(body)),
    continueAsGuest: () => setGuest(true),
    exitGuest: () => setGuest(false), // goes back to the welcome screen to log in
    logout: async () => {
      setToken(null);
      await AsyncStorage.removeItem(KEY);
      setUser(null);
      setGuest(false);
    },
  }), [user, guest, loading, finish]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

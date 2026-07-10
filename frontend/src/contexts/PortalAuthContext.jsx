/**
 * Student portal auth context + hooks.
 *
 * Independent from the admin AuthContext to avoid role leakage: an admin
 * cannot accidentally use their JWT on portal endpoints and vice-versa.
 * Token is persisted in localStorage under `portalToken`.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";

const BASE = process.env.REACT_APP_BACKEND_URL;
const STORAGE_KEY = "portalToken";

const PortalAuthContext = createContext({
  token: null,
  student: null,
  status: "loading",   // loading | authenticated | anonymous
  login: async () => {},
  logout: () => {},
  refresh: async () => {},
  api: null,
});

export function PortalAuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY) || null);
  const [student, setStudent] = useState(null);
  const [status, setStatus] = useState(token ? "loading" : "anonymous");

  const api = useMemo(() => {
    const inst = axios.create({
      baseURL: `${BASE}/api`,
      timeout: 20000,
    });
    inst.interceptors.request.use((cfg) => {
      const t = localStorage.getItem(STORAGE_KEY);
      if (t) cfg.headers.Authorization = `Bearer ${t}`;
      return cfg;
    });
    return inst;
  }, []);

  const refresh = useCallback(async () => {
    if (!token) {
      setStatus("anonymous");
      setStudent(null);
      return;
    }
    try {
      const r = await api.get("/portal/me");
      setStudent(r.data);
      setStatus("authenticated");
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      setToken(null);
      setStudent(null);
      setStatus("anonymous");
    }
  }, [token, api]);

  useEffect(() => { refresh(); }, [refresh]);

  const login = useCallback(async ({ email, password }) => {
    const r = await api.post("/portal/login", { email, password });
    localStorage.setItem(STORAGE_KEY, r.data.access_token);
    setToken(r.data.access_token);
    setStudent(r.data.student);
    setStatus("authenticated");
    return r.data;
  }, [api]);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setStudent(null);
    setStatus("anonymous");
  }, []);

  const value = { token, student, status, login, logout, refresh, api };
  return (
    <PortalAuthContext.Provider value={value}>
      {children}
    </PortalAuthContext.Provider>
  );
}

export function usePortalAuth() {
  return useContext(PortalAuthContext);
}

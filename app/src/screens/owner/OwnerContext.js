import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, errorMessage } from "../../api";

const Ctx = createContext(null);
export const useOwnerCafe = () => useContext(Ctx);

// Loads the signed-in owner's cafe once and shares it with the four owner screens.
// The app works with the owner's first cafe; the API itself supports several.
export function OwnerProvider({ children }) {
  const [cafes, setCafes] = useState(null);
  const [error, setError] = useState("");
  const reload = useCallback(async () => {
    setError("");
    try { setCafes((await api.ownerCafes()).cafes); } catch (e) { setError(errorMessage(e)); }
  }, []);
  useEffect(() => { reload(); }, [reload]);
  const value = useMemo(() => ({ loaded: cafes !== null, cafe: cafes?.[0] ?? null, error, reload }), [cafes, error, reload]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

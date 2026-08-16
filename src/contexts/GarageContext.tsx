import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { resolveModel } from "@/data/vehicleCatalogue";

/**
 * GarageContext
 * ─────────────
 * Global "which car am I shopping for?" state for the native app.
 * Persisted twice:
 *   1. localStorage (`almasria.garage`) — instant, works for guests.
 *   2. profiles.car_model / car_year — follows the signed-in account.
 */

export interface GarageVehicle {
  id: string;
  modelKey: string;
  model: string;
  year: number;
  displayName: string;
}

interface GarageContextValue {
  vehicles: GarageVehicle[];
  activeVehicle: GarageVehicle | null;
  setActiveVehicle: (id: string | null) => void;
  addVehicle: (modelKey: string, model: string, year: number) => GarageVehicle;
  removeVehicle: (id: string) => void;
  clearGarage: () => void;
}

const STORAGE_KEY = "almasria.garage";

const GarageContext = createContext<GarageContextValue>({
  vehicles: [],
  activeVehicle: null,
  setActiveVehicle: () => {},
  addVehicle: () => ({ id: "", modelKey: "", model: "", year: 0, displayName: "" }),
  removeVehicle: () => {},
  clearGarage: () => {},
});

interface StoredGarage {
  vehicles: GarageVehicle[];
  activeId: string | null;
}

const readStorage = (): StoredGarage => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { vehicles: [], activeId: null };
    const parsed = JSON.parse(raw);
    const vehicles: GarageVehicle[] = Array.isArray(parsed?.vehicles)
      ? parsed.vehicles.filter(
          (v: any) => v && typeof v.id === "string" && typeof v.modelKey === "string" && Number(v.year) > 0,
        )
      : [];
    const activeId = typeof parsed?.activeId === "string" ? parsed.activeId : null;
    return { vehicles, activeId };
  } catch {
    return { vehicles: [], activeId: null };
  }
};

const writeStorage = (state: StoredGarage) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* private mode / quota — garage stays in-memory for this session */
  }
};

export const GarageProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [state, setState] = useState<StoredGarage>(() => readStorage());

  useEffect(() => {
    writeStorage(state);
  }, [state]);

  /* Hydrate from the saved profile car when the local garage is empty. */
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    (async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("car_model, car_year")
          .eq("id", user.id)
          .maybeSingle();
        if (cancelled || !data?.car_model || !data?.car_year) return;
        const resolved = resolveModel(data.car_model);
        if (!resolved) return;
        setState((prev) => {
          const exists = prev.vehicles.some(
            (v) => v.modelKey === resolved.key && v.year === Number(data.car_year),
          );
          if (exists) return prev;
          const vehicle: GarageVehicle = {
            id: `${resolved.key}-${data.car_year}`,
            modelKey: resolved.key,
            model: resolved.label,
            year: Number(data.car_year),
            displayName: `${resolved.label} ${data.car_year}`,
          };
          return {
            vehicles: [vehicle, ...prev.vehicles],
            activeId: prev.activeId ?? vehicle.id,
          };
        });
      } catch {
        /* profile read is best-effort — never block the UI */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const syncProfile = useCallback(
    async (vehicle: GarageVehicle) => {
      if (!user?.id) return;
      try {
        await supabase
          .from("profiles")
          .update({ car_model: vehicle.model, car_year: vehicle.year })
          .eq("id", user.id);
      } catch {
        /* best-effort sync */
      }
    },
    [user?.id],
  );

  const addVehicle = useCallback(
    (modelKey: string, model: string, year: number) => {
      const vehicle: GarageVehicle = {
        id: `${modelKey}-${year}`,
        modelKey,
        model,
        year,
        displayName: `${model} ${year}`,
      };
      setState((prev) => ({
        vehicles: [vehicle, ...prev.vehicles.filter((v) => v.id !== vehicle.id)].slice(0, 6),
        activeId: vehicle.id,
      }));
      void syncProfile(vehicle);
      return vehicle;
    },
    [syncProfile],
  );

  const setActiveVehicle = useCallback((id: string | null) => {
    setState((prev) => ({ ...prev, activeId: id }));
  }, []);

  const removeVehicle = useCallback((id: string) => {
    setState((prev) => {
      const vehicles = prev.vehicles.filter((v) => v.id !== id);
      return { vehicles, activeId: prev.activeId === id ? (vehicles[0]?.id ?? null) : prev.activeId };
    });
  }, []);

  const clearGarage = useCallback(() => setState({ vehicles: [], activeId: null }), []);

  const value = useMemo<GarageContextValue>(() => {
    const activeVehicle = state.vehicles.find((v) => v.id === state.activeId) ?? null;
    return {
      vehicles: state.vehicles,
      activeVehicle,
      setActiveVehicle,
      addVehicle,
      removeVehicle,
      clearGarage,
    };
  }, [state, setActiveVehicle, addVehicle, removeVehicle, clearGarage]);

  return <GarageContext.Provider value={value}>{children}</GarageContext.Provider>;
};

export const useGarage = () => useContext(GarageContext);

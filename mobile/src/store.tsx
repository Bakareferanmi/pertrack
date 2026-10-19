import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { EMPTY, State } from './core';
import { syncReminders } from './notify';

const KEY = 'pertrack:v1';

type Store = {
  state: State;
  ready: boolean;
  update: (fn: (s: State) => State) => void;
  reset: () => void;
  capped: boolean;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(EMPTY);
  const [ready, setReady] = useState(false);
  const [capped, setCapped] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) {
          const p = JSON.parse(raw);
          setState({ ...EMPTY, ...p, settings: { ...EMPTY.settings, ...(p.settings ?? {}) } });
        }
      } catch {}
      loaded.current = true;
      setReady(true);
    })();
  }, []);

  // persist + re-schedule native reminders on every change
  useEffect(() => {
    if (!loaded.current) return;
    AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
    syncReminders(state).then((r) => setCapped(r.capped)).catch(() => {});
  }, [state]);

  const update = useCallback((fn: (s: State) => State) => setState((s) => fn(s)), []);
  const reset = useCallback(() => setState(EMPTY), []);

  return <Ctx.Provider value={{ state, ready, update, reset, capped }}>{children}</Ctx.Provider>;
}

export const useStore = () => {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider missing');
  return s;
};

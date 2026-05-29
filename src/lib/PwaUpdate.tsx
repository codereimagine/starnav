import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

// Ported from the trilogy (uptyme/bewthr). The 'prompt' registerType in
// vite.config makes a new service worker install but WAIT for the user to
// confirm; this context exposes the banner-visible state + "refresh now" /
// "check for updates" actions wired to that flow.

export type CheckResult = 'idle' | 'checking' | 'up-to-date' | 'found' | 'error';

interface PwaUpdateContextValue {
  available: boolean;
  bannerVisible: boolean;
  dismiss: () => void;
  refreshNow: () => void;
  checkForUpdates: () => Promise<void>;
  checkResult: CheckResult;
}

const PwaUpdateContext = createContext<PwaUpdateContextValue | null>(null);

export function PwaUpdateProvider({ children }: { children: ReactNode }) {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      registrationRef.current = r ?? null;
    },
  });

  // Session-only dismiss. A reload reopens the banner if needRefresh is still
  // true — that's user-initiated, not a nag.
  const [dismissed, setDismissed] = useState(false);
  const [checkResult, setCheckResult] = useState<CheckResult>('idle');

  useEffect(() => {
    if (checkResult === 'up-to-date' || checkResult === 'error') {
      const t = window.setTimeout(() => setCheckResult('idle'), 3000);
      return () => window.clearTimeout(t);
    }
  }, [checkResult]);

  const dismiss = useCallback(() => setDismissed(true), []);
  const refreshNow = useCallback(() => { void updateServiceWorker(true); }, [updateServiceWorker]);

  const checkForUpdates = useCallback(async () => {
    const reg = registrationRef.current;
    if (!reg) { setCheckResult('error'); return; }
    setCheckResult('checking');
    try {
      await reg.update();
      await new Promise((r) => window.setTimeout(r, 500));
      if (reg.waiting) {
        setDismissed(false);
        setNeedRefresh(true);
        setCheckResult('found');
      } else {
        setCheckResult('up-to-date');
      }
    } catch {
      setCheckResult('error');
    }
  }, [setNeedRefresh]);

  const value: PwaUpdateContextValue = {
    available: needRefresh,
    bannerVisible: needRefresh && !dismissed,
    dismiss,
    refreshNow,
    checkForUpdates,
    checkResult,
  };

  return <PwaUpdateContext.Provider value={value}>{children}</PwaUpdateContext.Provider>;
}

export function usePwaUpdate(): PwaUpdateContextValue {
  const ctx = useContext(PwaUpdateContext);
  if (!ctx) throw new Error('usePwaUpdate must be used inside PwaUpdateProvider');
  return ctx;
}

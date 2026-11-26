import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';

interface AppContextValue {
  appName: string;
  appSubtitle: string;
  allowedDomain: string;
  /** Configured base URL for phones; empty means use the current origin. */
  publicUrl: string;
  /** Full display string: "Scaleway by ⚡ Quizz" or "⚡ Quizz" */
  displayName: string;
  /** Short brand string: "Scaleway" or "⚡ Quizz" */
  brandName: string;
  /** Whether /api/public has answered yet. Until 'ready', empty fields mean "unknown", not "off". */
  configStatus: 'loading' | 'ready' | 'error';
}

const AppContext = createContext<AppContextValue>({
  appName: '',
  appSubtitle: '',
  allowedDomain: '',
  publicUrl: '',
  displayName: '⚡ Quizz',
  brandName: '⚡ Quizz',
  configStatus: 'loading',
});

function buildDisplay(
  appName: string,
  appSubtitle: string,
  allowedDomain: string,
  publicUrl: string,
  configStatus: AppContextValue['configStatus'],
): AppContextValue {
  const trimmed = appName.trim();
  return {
    appName: trimmed,
    appSubtitle: appSubtitle.trim(),
    allowedDomain: allowedDomain.trim(),
    publicUrl: publicUrl.trim(),
    displayName: trimmed ? `${trimmed} by ⚡ Quizz` : '⚡ Quizz',
    brandName: trimmed || '⚡ Quizz',
    configStatus,
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<AppContextValue>(buildDisplay('', '', '', '', 'loading'));

  useEffect(() => {
    let cancelled = false;
    // Retry a few times: a single failed request used to leave the app thinking
    // registration was disabled (empty allowedDomain) until a full reload.
    async function load(attempt: number): Promise<void> {
      try {
        const r = await fetch('/api/public', { cache: 'no-store' });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const { appName, appSubtitle, allowedDomain, publicUrl } = (await r.json()) as {
          appName?: string;
          appSubtitle?: string;
          allowedDomain?: string;
          publicUrl?: string;
        };
        if (cancelled) return;
        setValue(
          buildDisplay(
            appName ?? '',
            appSubtitle ?? '',
            allowedDomain ?? '',
            publicUrl ?? '',
            'ready',
          ),
        );
      } catch {
        if (cancelled) return;
        if (attempt < 4) {
          setTimeout(() => void load(attempt + 1), 1000 * 2 ** attempt);
        } else {
          setValue((v) => ({ ...v, configStatus: 'error' }));
        }
      }
    }
    void load(0);
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep browser tab title in sync
  useEffect(() => {
    document.title = value.displayName;
  }, [value.displayName]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  return useContext(AppContext);
}

import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';

interface AppContextValue {
  appName: string;
  appSubtitle: string;
  /** Full display string: "Scaleway by ⚡ Quizz" or "⚡ Quizz" */
  displayName: string;
  /** Short brand string: "Scaleway" or "⚡ Quizz" */
  brandName: string;
}

const AppContext = createContext<AppContextValue>({
  appName: '',
  appSubtitle: '',
  displayName: '⚡ Quizz',
  brandName: '⚡ Quizz',
});

function buildDisplay(appName: string, appSubtitle: string): AppContextValue {
  const trimmed = appName.trim();
  return {
    appName: trimmed,
    appSubtitle: appSubtitle.trim(),
    displayName: trimmed ? `${trimmed} by ⚡ Quizz` : '⚡ Quizz',
    brandName: trimmed || '⚡ Quizz',
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<AppContextValue>(buildDisplay('', ''));

  useEffect(() => {
    fetch('/api/public')
      .then((r) => r.json())
      .then(({ appName, appSubtitle }: { appName: string; appSubtitle: string }) =>
        setValue(buildDisplay(appName, appSubtitle ?? '')),
      )
      .catch(() => {});
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

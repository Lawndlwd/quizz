import { useEffect } from 'react';
import type { ThemeId } from '@/types';
import { sound } from '@/lib/sound';

/**
 * Applies a quiz theme to the game screens by setting `data-theme` on the root
 * <html> element (scoped CSS var overrides live in styles/index.css) and syncing
 * the sound "flavor". Removes the attribute on unmount so the admin dashboard and
 * other pages stay on the default palette.
 */
export function useTheme(theme: ThemeId | null | undefined) {
  useEffect(() => {
    const t: ThemeId = theme ?? 'default';
    const root = document.documentElement;
    root.dataset.theme = t;
    sound.setFlavor(t);
    return () => {
      delete root.dataset.theme;
      sound.setFlavor('default');
    };
  }, [theme]);
}

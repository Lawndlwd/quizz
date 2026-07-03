import { useLocation } from 'react-router-dom';

/** Base path for quiz-creator routes: `/admin` or `/u`. */
export function useCreatorBase(): '/admin' | '/u' {
  const { pathname } = useLocation();
  return pathname.startsWith('/u') ? '/u' : '/admin';
}

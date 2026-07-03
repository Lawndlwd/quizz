import { useCallback, useEffect, useRef, useState } from 'react';

/** Countdown timer that does not restart when seconds tick — only when `start`/`reset` is called. */
export function useCountdown(initialSeconds = 0) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(
    (from?: number) => {
      stop();
      if (from !== undefined) setSeconds(from);
      intervalRef.current = setInterval(() => {
        setSeconds((t) => {
          if (t <= 1) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    },
    [stop],
  );

  const reset = useCallback(
    (value = 0) => {
      stop();
      setSeconds(value);
    },
    [stop],
  );

  useEffect(() => () => stop(), [stop]);

  return { seconds, setSeconds, start, stop, reset };
}

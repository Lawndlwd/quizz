import { useCallback, useEffect, useRef, useState } from 'react';
import type { QuestionPayload } from '@/types';
import { useCountdown } from './useCountdown';

/**
 * Two-step question clock: a read-only phase (question shown alone) followed by
 * the answer countdown. `seconds` is the answer timer (it holds at the full
 * time while reading), `reading`/`readLeft` describe the first phase.
 */
export function useQuestionClock() {
  const readTimer = useCountdown(0);
  const answerTimer = useCountdown(0);
  const [reading, setReading] = useState(false);
  const switchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSwitch = useCallback(() => {
    if (switchRef.current) {
      clearTimeout(switchRef.current);
      switchRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    clearSwitch();
    readTimer.stop();
    answerTimer.stop();
    setReading(false);
  }, [clearSwitch, readTimer, answerTimer]);

  const begin = useCallback(
    (q: QuestionPayload) => {
      clearSwitch();
      const read = Math.max(0, q.readRemaining ?? q.readSec ?? 0);
      const answer = q.timeRemaining ?? q.timeSec;
      if (read > 0) {
        setReading(true);
        readTimer.start(read);
        answerTimer.reset(answer);
        switchRef.current = setTimeout(() => {
          switchRef.current = null;
          setReading(false);
          answerTimer.start(answer);
        }, read * 1000);
      } else {
        setReading(false);
        readTimer.reset(0);
        answerTimer.start(answer);
      }
    },
    [clearSwitch, readTimer, answerTimer],
  );

  useEffect(() => clearSwitch, [clearSwitch]);

  return { seconds: answerTimer.seconds, reading, readLeft: readTimer.seconds, begin, stop };
}

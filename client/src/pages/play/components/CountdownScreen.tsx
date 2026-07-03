import { useEffect, useState } from 'react';
import { PageCenter } from '@/components/layout';

interface Props {
  seconds: number;
}

export function CountdownScreen({ seconds }: Props) {
  const [count, setCount] = useState(seconds);

  useEffect(() => {
    if (count <= 0) return;
    const id = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [count]);

  const label = count > 0 ? String(count) : 'GO!';

  return (
    <PageCenter className="gap-2.5">
      <div className="mono-label" style={{ letterSpacing: '0.24em', color: 'var(--text2)' }}>
        Get ready…
      </div>
      <div className="countdown-number" key={label}>
        {label}
      </div>
      <div className="text-base text-[#64748b]">First question coming up</div>
    </PageCenter>
  );
}

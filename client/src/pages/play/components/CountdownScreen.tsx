import { useEffect, useState } from 'react';

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
    <div className="page-center">
      <div className="countdown-number" key={label}>
        {label}
      </div>
    </div>
  );
}

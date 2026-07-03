import { useEffect, useState } from 'react';
import { hasQuestionImage } from '@/helpers';
import { cn } from '@/lib/utils';

interface Props {
  src?: string | null;
  alt?: string;
  className?: string;
}

export function QuestionImage({ src, alt = 'Question', className }: Props) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!hasQuestionImage(src) || failed) return null;

  return (
    <img src={src.trim()} alt={alt} className={cn(className)} onError={() => setFailed(true)} />
  );
}

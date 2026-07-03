import { useState } from 'react';
import { isImageUrl } from '@/helpers';

/**
 * Renders an answer option: an <img> when the value is an image URL, otherwise
 * the plain text. No wrapper element — drops into whatever span/div already
 * styles the option. Pass `imgClassName` to size the image for the context
 * (big answer buttons vs. small distribution rows). If the image fails to load
 * (e.g. the value is a non-image link), it falls back to showing the text.
 */
export function OptionText({
  value,
  imgClassName = 'option-img',
}: {
  value: string;
  imgClassName?: string;
}) {
  // Track the src that failed so a new option (component reused across
  // questions) re-attempts the image instead of staying in the failed state.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (isImageUrl(value) && failedSrc !== value) {
    return (
      <img
        src={value}
        alt="Answer option"
        className={imgClassName}
        loading="lazy"
        onError={() => setFailedSrc(value)}
      />
    );
  }
  return <>{value}</>;
}

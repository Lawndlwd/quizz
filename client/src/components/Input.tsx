import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import { Input as ShadcnInput } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea as ShadcnTextarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  hint?: string;
  noMargin?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, noMargin, className, id, ...props }, ref) => {
    const el = <ShadcnInput ref={ref} id={id} className={className} {...props} />;

    if (!label) return el;

    return (
      <div className={cn('flex flex-col gap-2', !noMargin && 'mb-5')}>
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        {el}
        {hint && <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode;
  hint?: string;
  noMargin?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, noMargin, className, id, ...props }, ref) => {
    const el = <ShadcnTextarea ref={ref} id={id} className={className} {...props} />;

    if (!label) return el;

    return (
      <div className={cn('flex flex-col gap-2', !noMargin && 'mb-5')}>
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        {el}
        {hint && <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';

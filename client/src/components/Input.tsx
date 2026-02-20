import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  hint?: string;
  noMargin?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, noMargin, ...props }, ref) => {
    const el = <input ref={ref} {...props} />;

    if (!label) return el;

    return (
      <div className="form-group" style={noMargin ? { marginBottom: 0 } : undefined}>
        <label htmlFor={props.id}>{label}</label>
        {el}
        {hint && <p className="text-xs text-muted mt-1">{hint}</p>}
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
  ({ label, hint, noMargin, ...props }, ref) => {
    const el = <textarea ref={ref} {...props} />;

    if (!label) return el;

    return (
      <div className="form-group" style={noMargin ? { marginBottom: 0 } : undefined}>
        <label htmlFor={props.id}>{label}</label>
        {el}
        {hint && <p className="text-xs text-muted mt-1">{hint}</p>}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';

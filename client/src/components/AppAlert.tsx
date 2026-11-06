import type { ReactNode } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

type AppAlertVariant = 'error' | 'success' | 'warn' | 'info';

const variantClass: Record<AppAlertVariant, string> = {
  error: 'border-destructive/30 bg-destructive/10 text-destructive [&_p]:text-destructive/90',
  success: 'border-ok/30 bg-ok/10 text-ok',
  warn: 'border-warn/30 bg-warn/10 text-warn',
  info: 'border-brand/30 bg-brand/10 text-brand',
};

export function AppAlert({
  variant,
  children,
  className,
}: {
  variant: AppAlertVariant;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Alert className={cn('mb-4', variantClass[variant], className)}>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}

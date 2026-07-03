import type { ReactNode } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

type AppAlertVariant = 'error' | 'success' | 'warn' | 'info';

const variantClass: Record<AppAlertVariant, string> = {
  error: 'border-destructive/30 bg-destructive/10 text-destructive [&_p]:text-destructive/90',
  success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  warn: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  info: 'border-blue-500/30 bg-blue-500/10 text-blue-200',
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

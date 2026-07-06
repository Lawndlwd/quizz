import { createContext, type ReactNode, useCallback, useContext, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ConfirmOptions {
  title?: string;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  /** `danger` styles the confirm button as destructive. */
  variant?: 'default' | 'danger';
}

interface AlertOptions {
  title?: string;
  message: ReactNode;
  okText?: string;
}

interface DialogContextValue {
  /** Resolves true if confirmed, false if cancelled/dismissed. */
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  /** Resolves once acknowledged. */
  alert: (opts: AlertOptions) => Promise<void>;
}

const DialogContext = createContext<DialogContextValue | null>(null);

type Kind = 'confirm' | 'alert';

interface DialogState {
  kind: Kind;
  title?: string;
  message: ReactNode;
  confirmText: string;
  cancelText: string;
  variant: 'default' | 'danger';
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DialogState | null>(null);
  const [open, setOpen] = useState(false);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const settle = useCallback((value: boolean) => {
    setOpen(false);
    resolver.current?.(value);
    resolver.current = null;
  }, []);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setState({
      kind: 'confirm',
      title: opts.title ?? 'Are you sure?',
      message: opts.message,
      confirmText: opts.confirmText ?? 'Confirm',
      cancelText: opts.cancelText ?? 'Cancel',
      variant: opts.variant ?? 'default',
    });
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const alert = useCallback((opts: AlertOptions) => {
    setState({
      kind: 'alert',
      title: opts.title,
      message: opts.message,
      confirmText: opts.okText ?? 'OK',
      cancelText: '',
      variant: 'default',
    });
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    }).then(() => undefined);
  }, []);

  return (
    <DialogContext.Provider value={{ confirm, alert }}>
      {children}
      <Dialog
        open={open}
        onOpenChange={(next) => {
          // Closing via overlay/escape/X counts as cancel (false).
          if (!next) settle(false);
        }}
      >
        {state && (
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              {state.title && <DialogTitle>{state.title}</DialogTitle>}
              <DialogDescription asChild>
                <div className="text-sm text-muted-foreground">{state.message}</div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              {state.kind === 'confirm' && (
                <Button type="button" variant="ghost" onClick={() => settle(false)}>
                  {state.cancelText}
                </Button>
              )}
              <Button
                type="button"
                variant={state.variant === 'danger' ? 'destructive' : 'default'}
                onClick={() => settle(true)}
                autoFocus
              >
                {state.confirmText}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </DialogContext.Provider>
  );
}

export function useDialog(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used within DialogProvider');
  return ctx;
}

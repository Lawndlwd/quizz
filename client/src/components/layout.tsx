import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import CreatorNav from './CreatorNav';

export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex min-h-0 flex-1 flex-col', className)}>{children}</div>;
}

export function PageCenter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn('flex min-h-screen flex-1 flex-col items-center justify-center p-6', className)}
    >
      {children}
    </div>
  );
}

export function PageVCenter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex min-h-screen flex-1 flex-col items-center justify-center px-4 py-8',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function MainContent({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-6xl flex-1 p-6', className)}>{children}</div>;
}

type AuthCardProps = {
  children: ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg';
};

const maxWidthClass = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export function AuthCard({ children, className, maxWidth = 'md' }: AuthCardProps) {
  return (
    <Card className={cn('w-full shadow-xl ring-foreground/10', maxWidthClass[maxWidth], className)}>
      <CardContent className="p-8">{children}</CardContent>
    </Card>
  );
}

export function AppLogo({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'bg-gradient-to-br from-blue-600 to-blue-400 bg-clip-text text-2xl font-extrabold text-transparent',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Subtitle({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('text-sm text-muted-foreground', className)}>{children}</p>;
}

/** Full-page loading (or error) placeholder shown under the creator nav. */
export function PageLoading({ message = 'Loading…', nav }: { message?: string; nav?: ReactNode }) {
  return (
    <Page>
      {nav ?? <CreatorNav />}
      <PageCenter>
        <p className="text-muted-foreground">{message}</p>
      </PageCenter>
    </Page>
  );
}

export function FormRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2', className)}>{children}</div>;
}

export function SectionDivider({ className }: { className?: string }) {
  return <div className={cn('my-5 border-t border-border', className)} />;
}

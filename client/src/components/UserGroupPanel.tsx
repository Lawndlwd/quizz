import { ChevronDown, Settings } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface UserGroupPanelProps {
  email: string | null;
  username: string;
  count: number;
  countLabel: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

function userInitials(username: string): string {
  const parts = username.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return username.slice(0, 2).toUpperCase();
}

export function UserGroupPanel({
  email,
  username,
  count,
  countLabel,
  defaultOpen = false,
  children,
}: UserGroupPanelProps) {
  const isAdmin = username === 'Platform admin';

  return (
    <details
      className="group overflow-hidden rounded-xl border border-border bg-card ring-1 ring-foreground/10"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4 transition hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold',
            isAdmin ? 'bg-muted text-muted-foreground' : 'bg-blue-500/20 text-blue-300',
          )}
        >
          {isAdmin ? <Settings className="size-5" /> : userInitials(username)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{username}</div>
          {email && <div className="truncate text-sm text-muted-foreground">{email}</div>}
        </div>
        <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          {count} {countLabel}
        </span>
        <span
          className="shrink-0 text-muted-foreground transition group-open:rotate-180"
          aria-hidden
        >
          <ChevronDown className="size-4" />
        </span>
      </summary>
      <div className="border-t border-border">{children}</div>
    </details>
  );
}

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type SessionStatus = 'waiting' | 'active' | 'finished';

const statusClass: Record<SessionStatus, string> = {
  waiting: 'border-amber-500/30 bg-amber-500/15 text-amber-300',
  active: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300',
  finished: 'border-border bg-muted text-muted-foreground',
};

export function StatusBadge({ status, className }: { status: SessionStatus; className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn('font-semibold uppercase tracking-wide', statusClass[status], className)}
    >
      {status}
    </Badge>
  );
}

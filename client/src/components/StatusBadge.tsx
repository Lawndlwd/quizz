import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type SessionStatus = 'waiting' | 'active' | 'finished';

const statusClass: Record<SessionStatus, string> = {
  waiting: 'border-warn/30 bg-warn/15 text-warn',
  active: 'border-ok/30 bg-ok/15 text-ok',
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

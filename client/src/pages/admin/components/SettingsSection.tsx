import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface SettingsSectionProps {
  id: string;
  icon: LucideIcon;
  title: string;
  description?: string;
  children: ReactNode;
}

export function SettingsSection({
  id,
  icon: Icon,
  title,
  description,
  children,
}: SettingsSectionProps) {
  return (
    <Card id={id} className="w-full scroll-mt-20">
      <CardHeader className="flex-row items-start gap-4 space-y-0">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
          aria-hidden
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <CardTitle className="text-lg">{title}</CardTitle>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

interface SettingsFieldGroupProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function SettingsFieldGroup({ title, description, children }: SettingsFieldGroupProps) {
  return (
    <div className="mt-6 first:mt-0">
      <div className="mb-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div>{children}</div>
    </div>
  );
}

interface SettingsToggleProps {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function SettingsToggle({
  id,
  label,
  description,
  checked,
  onChange,
  disabled,
}: SettingsToggleProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/30 p-4 mb-4',
        disabled && 'opacity-50',
      )}
    >
      <div className="min-w-0 space-y-1">
        <Label htmlFor={id} className="text-sm font-semibold">
          {label}
        </Label>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

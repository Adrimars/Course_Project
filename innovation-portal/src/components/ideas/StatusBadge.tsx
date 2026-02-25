import { Badge } from '@/components/ui/Badge';

interface StatusBadgeProps {
  status: string;
}

const STATUS_CONFIG: Record<string, { label: string; variant: string }> = {
  DRAFT:        { label: 'Draft',        variant: 'yellow' },
  SUBMITTED:    { label: 'Submitted',    variant: 'gray' },
  UNDER_REVIEW: { label: 'Under Review', variant: 'blue' },
  ACCEPTED:     { label: 'Accepted',     variant: 'green' },
  REJECTED:     { label: 'Rejected',     variant: 'red' },
  INSPECTING:   { label: 'Inspecting',   variant: 'purple' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, variant: 'gray' };
  return <Badge variant={config.variant as any}>{config.label}</Badge>;
}

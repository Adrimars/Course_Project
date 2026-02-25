import { Badge } from '@/components/ui/Badge';
import { IdeaStatus } from '@/types';

interface StatusBadgeProps {
  status: IdeaStatus | string;
}

const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
};

/**
 * spec CHK027: Status badge colors defined with Tailwind CSS classes.
 * SUBMITTED: blue, UNDER_REVIEW: amber, ACCEPTED: green, REJECTED: red.
 * Badges include text (not color alone) for WCAG 2.1 AA compliance (CHK046).
 */
export function StatusBadge({ status }: StatusBadgeProps) {
  const variant = status as
    | 'SUBMITTED'
    | 'UNDER_REVIEW'
    | 'ACCEPTED'
    | 'REJECTED';
  return (
    <Badge variant={variant}>
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

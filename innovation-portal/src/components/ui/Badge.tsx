// spec CHK027: Status badge colors defined with Tailwind CSS classes

interface BadgeProps {
  variant?: string;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<string, string> = {
  // Status-name variants (legacy)
  SUBMITTED:    'bg-blue-100 text-blue-800',
  UNDER_REVIEW: 'bg-amber-100 text-amber-800',
  ACCEPTED:     'bg-green-100 text-green-800',
  REJECTED:     'bg-red-100 text-red-800',
  // Color-name variants (used by StatusBadge)
  gray:   'bg-gray-100 text-gray-700',
  blue:   'bg-blue-100 text-blue-800',
  green:  'bg-green-100 text-green-800',
  red:    'bg-red-100 text-red-800',
  amber:  'bg-amber-100 text-amber-800',
  purple: 'bg-purple-100 text-purple-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  default: 'bg-gray-100 text-gray-800',
};

export function Badge({
  variant = 'default',
  children,
  className = '',
}: BadgeProps) {
  const colorClass = variantClasses[variant] ?? variantClasses.default;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass} ${className}`}
    >
      {children}
    </span>
  );
}

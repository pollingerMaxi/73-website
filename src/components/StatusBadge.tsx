import { STATUS_LABELS, type ReleaseStatus } from '../domain/appCatalog'

interface StatusBadgeProps {
  status: ReleaseStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return <span className={`badge badge-${status}`}>{STATUS_LABELS[status]}</span>
}

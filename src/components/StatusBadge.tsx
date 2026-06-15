import { PaymentStatus } from '../types';
import { statusClass, statusLabel } from '../lib/helpers';

export function StatusBadge({ status }: { status: PaymentStatus }) {
  return <span className={statusClass(status)}>{statusLabel(status)}</span>;
}

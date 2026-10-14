import { STATUS_LABEL } from '../lib/brand';

const STYLE = {
  pending: 'bg-[var(--color-surface-2)] text-[var(--color-text-dim)] border-[var(--color-border)]',
  approved: 'bg-[var(--color-success)]/15 text-[var(--color-success)] border-[var(--color-success)]/40',
  needs_work: 'bg-[var(--color-warning)]/15 text-[var(--color-warning)] border-[var(--color-warning)]/40',
};

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex h-6 items-center rounded-full border px-2 text-[10px] font-semibold uppercase tracking-wider ${STYLE[status] || STYLE.pending}`}>
      {STATUS_LABEL[status] || status}
    </span>
  );
}

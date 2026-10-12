import type { ClientAuditEntry } from '../api/client';

/** Audit timestamps always use Tashkent, including seconds. */
export function formatClientAuditDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Tashkent',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const part = (key: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === key)?.value;
  return `${part('day')}-${part('month')}-${part('year')} ${part('hour')}:${part('minute')}:${part('second')}`;
}

export function clientAuditLines(audit: ClientAuditEntry | null | undefined, t: Record<string, string>): string[] {
  if (!audit) return ['—'];
  const lines = [
    formatClientAuditDate(audit.changedAt),
    `${t.auditChangedBy}: ${audit.userName?.trim() || '—'}`,
  ];
  if (audit.status === 'approved') {
    lines.push(`${t.auditApprovedBy}: ${audit.approvedByName?.trim() || '—'}`);
    lines.push(`${t.auditApprovedAt}: ${formatClientAuditDate(audit.approvedAt)}`);
  } else if (audit.status === 'pending') {
    lines.push(t.auditPending);
  } else if (audit.status === 'rejected') {
    lines.push(t.auditRejected);
  }
  return lines;
}

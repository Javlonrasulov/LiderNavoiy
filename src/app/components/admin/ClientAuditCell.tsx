import type { ClientAuditEntry } from '../../api/client';
import { clientAuditLines } from '../../utils/clientAudit';

export function ClientAuditCell({ audit, requested, t, dark }: {
  audit?: ClientAuditEntry | null;
  requested?: ClientAuditEntry | null;
  t: Record<string, string>;
  dark: boolean;
}) {
  return (
    <div className="space-y-1 leading-snug">
      {[audit, requested].filter((entry, index) => index === 0 || entry).map((entry, index) => (
        <div key={index} className={index ? `border-t pt-1 ${dark ? 'border-gray-700' : 'border-gray-200'}` : ''}>
          {clientAuditLines(entry, t).map((line, lineIndex) => (
            <div key={lineIndex} title={line} className={lineIndex === 0
              ? 'whitespace-nowrap'
              : `whitespace-normal break-words ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
              {line}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

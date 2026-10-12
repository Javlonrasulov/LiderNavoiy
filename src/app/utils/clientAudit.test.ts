import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clientAuditLines, formatClientAuditDate } from './clientAudit.ts';

const t = {
  auditChangedBy: 'Ўзгартирди', auditApprovedBy: 'Тасдиқлади', auditApprovedAt: 'Тасдиқланди',
  auditPending: 'Тасдиқлаш кутилмоқда', auditRejected: 'Рад қилинди',
};

test('audit time has seconds, Tashkent timezone and correct midnight rollover', () => {
  assert.equal(formatClientAuditDate('2026-10-10T09:35:28Z'), '10-10-2026 14:35:28');
  assert.equal(formatClientAuditDate('2026-10-10T19:00:01Z'), '11-10-2026 00:00:01');
  assert.equal(formatClientAuditDate('invalid'), '—');
  assert.equal(formatClientAuditDate(null), '—');
});

test('approved audit displays the editor and reviewer independently', () => {
  assert.deepEqual(clientAuditLines({
    userId: 'agent', userName: 'Olimov Odiljon', changedAt: '2026-10-10T09:35:28Z', status: 'approved',
    approvedById: 'admin', approvedByName: 'Javlon', approvedAt: '2026-10-10T09:42:11Z',
  }, t), [
    '10-10-2026 14:35:28', 'Ўзгартирди: Olimov Odiljon',
    'Тасдиқлади: Javlon', 'Тасдиқланди: 10-10-2026 14:42:11',
  ]);
});

test('direct, pending and rejected edits never display an approver', () => {
  for (const status of ['direct', 'pending', 'rejected'] as const) {
    const lines = clientAuditLines({
      userId: 'agent', userName: 'Agent', changedAt: null, status,
      approvedByName: 'Must not display', approvedAt: '2026-10-10T09:42:11Z',
    }, t);
    assert.equal(lines.some(line => line.includes('Тасдиқлади:') || line.includes('Тасдиқланди:')), false);
    if (status === 'pending') assert.equal(lines.at(-1), t.auditPending);
    if (status === 'rejected') assert.equal(lines.at(-1), t.auditRejected);
  }
});

test('unknown legacy audit is shown as a dash without using the creator', () => {
  assert.deepEqual(clientAuditLines(null, t), ['—']);
  assert.deepEqual(clientAuditLines({ userId: null, userName: null, changedAt: null, status: 'direct' }, t), ['—', 'Ўзгартирди: —']);
});

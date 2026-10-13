import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apiClientToRow } from './clientApi';

const client = {
  id: 'client-1', code: '1', name: 'Store', address: null, balance: 0,
  latitude: 40.1, longitude: 65.3,
};

test('last visit comes from the GPS arrival, independently of approval or edits', () => {
  const lastVisitAt = '2026-10-12T19:10:28Z';
  const row = apiClientToRow({ ...client, lastVisitAt, updatedAt: '2026-10-13T04:09:08Z' });
  assert.equal(row.lastVisit, lastVisitAt);
});

test('a client without a recorded GPS visit has no last visit', () => {
  const row = apiClientToRow({
    ...client, updatedAt: '2026-10-13T04:09:08Z',
    locationUpdatedAt: '2026-10-12T10:00:00Z',
  });
  assert.equal(row.lastVisit, '');
});

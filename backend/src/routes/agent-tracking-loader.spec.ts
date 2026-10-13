import { readFileSync } from 'fs';
import { resolve } from 'path';
import { runInNewContext } from 'vm';
import { transpileModule, ModuleKind } from 'typescript';

// Exercise the same loader as the employee page without mounting unrelated CRM tabs.
function loader(api: Record<string, unknown>) {
  const source = readFileSync(resolve(__dirname, '../../../src/app/utils/agentTracking.ts'), 'utf8');
  const exports: Record<string, any> = {};
  runInNewContext(transpileModule(source, { compilerOptions: { module: ModuleKind.CommonJS } }).outputText,
    { exports, require: () => ({ api }), Date, Intl, Map, Set, Number, Math });
  return exports.fetchDayTrack;
}

describe('Employee tracking loader', () => {
  it('surfaces API failures instead of returning misleading zero statistics', async () => {
    const fetch = loader({ getDailyTracking: async () => { throw new Error('Tracking unavailable'); } });
    await expect(fetch({ distributorId: 'agent-1', dateStr: '2026-10-13', empOnline: false })).rejects.toThrow('Tracking unavailable');
  });
  it('keeps planned clients, including clients without GPS, when no visits exist', async () => {
    const points = [
      { clientId: 'a', name: 'Store A', address: 'Navoiy', lineName: 'Line 1', lat: 40.1, lng: 65.3, hasCoords: true, status: 'missed', visits: [], orders: [] },
      { clientId: 'b', name: 'Store B', address: '', lineName: 'Line 1', lat: null, lng: null, hasCoords: false, status: 'missed', visits: [], orders: [] },
    ];
    const fetch = loader({
      getDailyRoute: async () => ({ points: [], stats: {} }),
      getVisitsForDistributor: async () => [],
      getDailyTracking: async () => ({ date: '2026-10-13', points, visits: [], clientOrders: [], gpsTrail: [],
        stats: { total: 2, ordered: 0, visited: 0, remoteOrdered: 0, missed: 2, noGps: 1, clientOrdered: 0, totalDistanceKm: 0, observedMinutes: 0 }, warnings: [] }),
    });
    const day = await fetch({ distributorId: 'agent-1', dateStr: '2026-10-13', empOnline: false });
    expect(day.total).toBe(2);
    expect(day.points).toHaveLength(2);
    expect(day.points.filter((p: any) => !p.hasCoords)).toHaveLength(1);
  });
  it('uses Tashkent clocks and never injects the current live location into a historical day', async () => {
    const fetch = loader({ getDailyTracking: async () => ({ points: [], visits: [], clientOrders: [], gpsTrail: [], warnings: [],
      stats: { total: 0, ordered: 0, visited: 0, remoteOrdered: 0, missed: 0, noGps: 0, clientOrdered: 0, totalDistanceKm: 0, observedMinutes: 0 } }) });
    const day = await fetch({ distributorId: 'agent-1', dateStr: '2020-01-01', empOnline: true,
      empLat: 40.1, empLng: 65.3, lastLocationAt: new Date().toISOString(), lastLoginAt: '2019-12-31T19:10:00Z' });
    expect(day.loginTime).toBe('00:10'); expect(day.empOnline).toBe(false); expect(day.hasRealLocation).toBe(false);
  });
});

describe('Map movement and replay', () => {
  const exports: Record<string, any> = {};
  beforeAll(() => {
    const source = readFileSync(resolve(__dirname, '../../../src/app/utils/trackingMapData.ts'), 'utf8');
    runInNewContext(transpileModule(source, { compilerOptions: { module: ModuleKind.CommonJS } }).outputText, { exports, Date, Map, Math });
  });
  const trail = [
    { lat: 40.1, lng: 65.3, recordedAt: '2026-10-13T03:00:00Z' },
    { lat: 40.2, lng: 65.3, recordedAt: '2026-10-13T03:01:00Z' },
    { lat: 40.4, lng: 65.3, recordedAt: '2026-10-13T03:10:00Z', breakBefore: true },
  ];
  it('separates missing GPS intervals from recorded geometry', () => {
    const segments = exports.splitGpsTrack(trail);
    expect(segments).toHaveLength(2); expect(segments[0].gap).toBe(false); expect(segments[1].gap).toBe(true);
  });
  it('holds at the last measured point across a signal gap instead of animating a guessed road', () => {
    const pos = exports.replayPosition(trail, .5);
    expect(pos.lat).toBe(40.2); expect(pos.gap).toBe(true);
    expect(exports.replayPosition(trail, 1).lat).toBe(40.4);
  });
  it('represents a shop-to-shop segment without GPS as a dashed connection', () => {
    const visits = [{ clientId: 'a', arrivedAt: trail[0].recordedAt, departedAt: trail[0].recordedAt, sequence: 1 },
      { clientId: 'b', arrivedAt: trail[2].recordedAt, departedAt: trail[2].recordedAt, sequence: 2 }];
    const points = [{ clientId: 'a', lat: 40.1, lng: 65.3, hasCoords: true }, { clientId: 'b', lat: 40.4, lng: 65.3, hasCoords: true }];
    expect(exports.visitMovements(visits, points, [])[0].gap).toBe(true);
  });
});

import { Repository } from 'typeorm';
import { AgentTrackingService, trackingDay } from './agent-tracking.service';
import { DistributorProfile } from '../distributors/entities/distributor-profile.entity';
import { Client } from '../clients/entities/client.entity';
import { SalesLine } from '../lines/entities/sales-line.entity';
import { Order } from '../orders/entities/order.entity';
import { Visit } from '../visits/entities/visit.entity';
import { RoutesService } from './routes.service';
import { OrderSource, OrderStatus, VisitStatus } from '../common/enums';

const at = (clock: string) => new Date(`2026-10-13T${clock}+05:00`);
const created = new Date('2026-01-01');
function client(id: string, lat: number | null = 40.1): Client {
  return Object.assign(new Client(), { id, name: id, address: id, lineCode: 'L1', companyId: 'org1', linkedCompanyIds: [], distributorId: 'agent1',
    latitude: lat, longitude: lat == null ? null : 65.3, orderRadiusMeters: 50, createdAt: created });
}
function order(id: string, clientId: string, source = OrderSource.AGENT, status = OrderStatus.CONFIRMED): Order {
  return { id, clientId, distributorId: 'agent1', companyId: 'org1', source, status, totalAmount: 100, returnedAmount: 0, createdAt: at('09:00:00') } as Order;
}
function fixture(shops: Client[], orderRows: Order[] = [], visitRows: Visit[] = [], gps: any[] = []) {
  const lineRows: SalesLine[] = [{ id: 'line1', companyId: 'org1', code: 'L1', name: 'Line 1', agentName: 'Agent One', agentVisitDays: [2], createdAt: created } as SalesLine];
  const qb: any = { where: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(), orderBy: jest.fn().mockReturnThis(), getMany: jest.fn().mockResolvedValue(shops) };
  const profiles = { findOne: jest.fn().mockResolvedValue({ id: 'agent1', companyId: 'org1', companyIds: ['org2'], user: { fullName: 'Agent One' } }) };
  const lines = { find: jest.fn().mockImplementation(async () => lineRows) };
  const clients = { createQueryBuilder: () => qb, find: jest.fn().mockResolvedValue(shops) };
  const orders = { find: jest.fn().mockResolvedValue(orderRows) };
  const visits = { find: jest.fn().mockResolvedValue(visitRows) };
  const routes = { getDailyRoute: jest.fn().mockResolvedValue({ points: gps }) };
  const service = new AgentTrackingService(profiles as unknown as Repository<DistributorProfile>, lines as unknown as Repository<SalesLine>,
    clients as unknown as Repository<Client>, orders as unknown as Repository<Order>, visits as unknown as Repository<Visit>, routes as unknown as RoutesService);
  return { service, lines, lineRows, qb, orders, visits };
}
const fix = (clock: string, latitude = 40.1, accuracy: number | null = 5) => ({ latitude, longitude: 65.3, recordedAt: at(clock), accuracy });

describe('Daily agent tracking', () => {
  it('includes unique planned shops before any visit, including GPSless and line-only assignments', async () => {
    const a = client('a'), b = client('b', null); a.distributorId = null;
    const f = fixture([a, b, a]);
    const day = await f.service.getDaily('agent1', '2026-10-13');
    expect(day.stats).toMatchObject({ total: 2, noGps: 1, missed: 2, ordered: 0, visited: 0, remoteOrdered: 0 });
    expect(day.points.map(p => p.clientId)).toEqual(['a', 'b']);
  });
  it('keeps the four statuses mutually exclusive, with orders counted once per planned shop', async () => {
    const a = client('a'), b = client('b', 40.11), c = client('c', 40.12), d = client('d', null);
    const gps = [fix('08:00:00'), fix('08:01:00'), fix('08:10:00', 40.11), fix('08:11:00', 40.11)];
    const f = fixture([a, b, c, d], [order('a1', 'a'), order('a2', 'a'), order('c1', 'c'), order('d-app', 'd', OrderSource.CLIENT)], [], gps);
    const day = await f.service.getDaily('agent1', '2026-10-13');
    expect(day.points.map(p => p.status)).toEqual(['ordered', 'visited', 'remote_ordered', 'missed']);
    expect(day.stats.ordered + day.stats.visited + day.stats.remoteOrdered + day.stats.missed).toBe(day.stats.total);
    expect(day.stats.clientOrdered).toBe(1);
    expect(day.clientOrders[0].id).toBe('d-app');
    expect(day.visits.map(v => v.clientId)).toEqual(['a', 'b']);
  });
  it('respects line weekdays and a different line agent, even with stale direct client assignments', async () => {
    const f = fixture([client('a')]);
    f.lineRows[0].agentVisitDays = [3];
    expect((await f.service.getDaily('agent1', '2026-10-13')).stats.total).toBe(0);
    f.lineRows[0].agentVisitDays = [2]; f.lineRows[0].agentName = 'Someone Else';
    expect((await f.service.getDaily('agent1', '2026-10-13')).stats.total).toBe(0);
  });
  it('does not infer an on-site visit from a synthetic order visit, inaccurate fixes or a single fix', async () => {
    const v = { clientId: 'a', visitedAt: at('08:00:00'), status: VisitStatus.COMPLETED, notes: 'client_order:app1', checkInLatitude: null, checkInLongitude: null } as Visit;
    for (const gps of [[fix('08:00:00')], [fix('08:00:00', 40.1, 100), fix('08:01:00', 40.1, 100)], [fix('08:00:00', 40.1, null), fix('08:01:00', 40.1, null)]]) {
      const day = await fixture([client('a')], [order('app1', 'a', OrderSource.CLIENT)], [v], gps).service.getDaily('agent1', '2026-10-13');
      expect(day.visits).toHaveLength(0); expect(day.points[0].status).toBe('missed');
    }
  });
  it('does not infer dwell across an excursion or a long signal gap', async () => {
    for (const gps of [[fix('08:00:00'), fix('08:00:15', 40.2), fix('08:01:00')], [fix('08:00:00'), fix('09:00:00')]]) {
      expect((await fixture([client('a')], [], [], gps).service.getDaily('agent1', '2026-10-13')).visits).toHaveLength(0);
    }
  });
  it('records repeat arrivals chronologically without increasing shop totals', async () => {
    const gps = [fix('08:00:00'), fix('08:01:00'), fix('08:02:00', 40.2), fix('09:00:00'), fix('09:01:00')];
    const day = await fixture([client('a')], [], [], gps).service.getDaily('agent1', '2026-10-13');
    expect(day.visits.map(v => v.sequence)).toEqual([1, 2]);
    expect(day.stats).toMatchObject({ total: 1, visited: 1 });
  });
  it('does not turn overlapping shop coordinates into two inferred visits', async () => {
    const day = await fixture([client('a'), client('b')], [], [], [fix('08:00:00'), fix('08:01:00')]).service.getDaily('agent1', '2026-10-13');
    expect(day.visits).toHaveLength(0); expect(day.stats.unverified).toBe(2);
  });
  it('accepts an explicit check-in only when nearby accurate agent GPS corroborates it', async () => {
    const v = { clientId: 'a', status: VisitStatus.COMPLETED, checkInLatitude: 40.1, checkInLongitude: 65.3, visitedAt: at('08:00:00') } as Visit;
    const verified = await fixture([client('a'), client('b')], [], [v], [fix('08:00:00')]).service.getDaily('agent1', '2026-10-13');
    expect(verified.visits.map(v => v.clientId)).toEqual(['a']); expect(verified.visits[0].evidence).toBe('check_in');
    const unverified = await fixture([client('a')], [], [v], [fix('09:00:00')]).service.getDaily('agent1', '2026-10-13');
    expect(unverified.visits).toHaveLength(0);
  });
  it('does not validate historical visits against coordinates changed after that date', async () => {
    const a = client('a'); a.locationUpdatedAt = at('23:59:59');
    a.locationUpdatedAt = new Date(+a.locationUpdatedAt + 86_400_000);
    const day = await fixture([a], [], [], [fix('08:00:00'), fix('08:01:00')]).service.getDaily('agent1', '2026-10-13');
    expect(day.visits).toHaveLength(0); expect(day.stats.unverified).toBe(1);
    expect(day.warnings.some(w => w.includes('koordinatasi'))).toBe(true);
  });
  it('excludes cancelled/draft orders, keeps accepted returned order history and its net amount', async () => {
    const returned = order('return', 'a'); returned.returnedAmount = 100;
    const day = await fixture([client('a')], [order('cancel', 'a', OrderSource.AGENT, OrderStatus.CANCELLED), order('draft', 'a', OrderSource.CLIENT, OrderStatus.DRAFT), returned]).service.getDaily('agent1', '2026-10-13');
    expect(day.points[0].orders).toHaveLength(1); expect(day.points[0].orders[0].netAmount).toBe(0); expect(day.points[0].status).toBe('remote_ordered');
  });
  it('queries visits/orders inside Tashkent boundaries and restricts manager company scope', async () => {
    const f = fixture([client('a')]);
    await f.service.getDaily('agent1', '2026-10-13', ['org1']);
    expect(f.lines.find.mock.calls[0][0].where.companyId.value).toEqual(['org1']);
    expect(f.orders.find.mock.calls[0][0].where.createdAt.value.map((d: Date) => d.toISOString())).toEqual(['2026-10-12T19:00:00.000Z', '2026-10-13T18:59:59.999Z']);
  });
  it('rejects malformed and impossible dates', () => {
    for (const date of ['', '2026-02-30', '2026-13-01', '2026-10-13T00:00:00']) expect(() => trackingDay(date)).toThrow();
  });
});

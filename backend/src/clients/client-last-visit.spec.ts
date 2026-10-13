import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DatabaseSync } from 'node:sqlite';
import { ClientsService } from './clients.service';
import { Client } from './entities/client.entity';
import { ClientRequest } from './entities/client-request.entity';
import { UserClientMembership } from './entities/user-client-membership.entity';
import { User } from '../auth/entities/user.entity';
import { Order } from '../orders/entities/order.entity';
import { LinesService } from '../lines/lines.service';

describe('Client last GPS visit', () => {
  let db: DatabaseSync;
  let service: ClientsService;
  let visible: Client[];
  let geographyChecks: number;
  let gpsStarted: boolean;

  beforeEach(async () => {
    geographyChecks = 0;
    gpsStarted = false;
    db = new DatabaseSync(':memory:');
    db.exec(`
      CREATE TABLE clients (id TEXT, "distributorId" TEXT, latitude REAL, longitude REAL, "orderRadiusMeters" REAL);
      CREATE TABLE location_points (id TEXT, "distributorId" TEXT, latitude REAL, longitude REAL, "recordedAt" TEXT, "receivedAt" TEXT);
    `);
    // SQLite executes the production query; only PostGIS geography and
    // PostgreSQL array bindings are adapted for this isolated, offline test.
    db.function('ST_MakePoint', (lng: number, lat: number) => JSON.stringify([lng, lat]));
    db.function('ST_SetSRID', (point: string, _srid: number) => point);
    db.function('ST_DWithin', (a: string, b: string, radius: number) => {
      // PostGIS geography functions are strict: a missing previous fix is null.
      if (a == null || b == null) return null;
      geographyChecks++;
      const [lng1, lat1] = JSON.parse(a);
      const [lng2, lat2] = JSON.parse(b);
      const rad = Math.PI / 180;
      const h = Math.sin((lat2 - lat1) * rad / 2) ** 2 +
        Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin((lng2 - lng1) * rad / 2) ** 2;
      return Number(6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)) <= radius);
    });
    visible = [Object.assign(new Client(), {
      id: 'client-1', name: 'Store', distributorId: 'agent-1',
      latitude: 40.1, longitude: 65.3, orderRadiusMeters: 50,
      updatedAt: new Date('2026-10-13T04:09:08Z'), balance: 0,
    })];
    db.prepare('INSERT INTO clients VALUES (?, ?, ?, ?, ?)').run('client-1', 'agent-1', 40.1, 65.3, 50);
    const qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(), orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn(async () => visible),
    };
    const module = await Test.createTestingModule({ providers: [
      ClientsService,
      { provide: getRepositoryToken(Client), useValue: {
        createQueryBuilder: () => qb,
        query: async (sql: string, parameters: unknown[]) => {
          gpsStarted = true;
          const ids = Array.isArray(parameters[0]) ? parameters[0] : parameters;
          return db.prepare(sql
            .replace('c.id = ANY($1::uuid[])', `c.id IN (${ids.map(() => '?').join(',')})`)
            .replaceAll('::geography', '')).all(...ids);
        },
      } },
      { provide: getRepositoryToken(ClientRequest), useValue: { find: async () => [] } },
      { provide: getRepositoryToken(Order), useValue: { find: async () => [] } },
      { provide: getRepositoryToken(UserClientMembership), useValue: {} },
      { provide: getRepositoryToken(User), useValue: {} },
      { provide: LinesService, useValue: {} },
    ] }).compile();
    service = module.get(ClientsService);
  });

  afterEach(() => db.close());

  function point(id: string, recordedAt: string, lat: number, agent = 'agent-1') {
    db.prepare('INSERT INTO location_points VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, agent, lat, 65.3, recordedAt, '2026-10-13T08:00:00Z');
  }

  it('keeps ordinary client list requests free of GPS calculations', async () => {
    await service.findAll();
    expect(gpsStarted).toBe(false);
  });

  it('uses the first in-radius point of the latest arrival, not approval or the last stationary point', async () => {
    point('1', '2026-10-10T09:00:00Z', 40.11);
    point('2', '2026-10-10T09:05:00Z', 40.1);
    point('3', '2026-10-10T09:07:00Z', 40.1001);
    point('4', '2026-10-10T09:20:00Z', 40.11);
    point('5', '2026-10-12T19:10:28Z', 40.1);
    point('6', '2026-10-12T19:15:00Z', 40.1001);
    const [result] = await service.findAll(undefined, undefined, undefined, undefined, true);
    expect(result).toHaveProperty('lastVisitAt', '2026-10-12T19:10:28.000Z');
  });

  it('does not count a different agent or an outside-radius location as a visit', async () => {
    point('1', '2026-10-12T09:00:00Z', 40.1006); // ~67m, outside 50m
    point('2', '2026-10-13T09:00:00Z', 40.1, 'other-agent');
    expect((await service.findAll(undefined, undefined, undefined, undefined, true))[0]).toHaveProperty('lastVisitAt', null);
  });

  it('uses each client radius and never takes another visible client’s GPS history', async () => {
    db.exec('UPDATE clients SET "orderRadiusMeters" = 100');
    db.prepare('INSERT INTO clients VALUES (?, ?, ?, ?, ?)').run('hidden-client', 'other-agent', 40.1, 65.3, 100);
    point('1', '2026-10-12T09:00:00Z', 40.1006);
    point('2', '2026-10-13T09:00:00Z', 40.1, 'other-agent');
    const result = await service.findAll(undefined, undefined, undefined, undefined, true);
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty('lastVisitAt', '2026-10-12T09:00:00.000Z');
  });

  it('leaves last visit empty when GPS or the assigned agent is missing', async () => {
    point('1', '2026-10-12T09:00:00Z', 40.1);
    db.exec('UPDATE clients SET latitude = NULL');
    expect((await service.findAll(undefined, undefined, undefined, undefined, true))[0]).toHaveProperty('lastVisitAt', null);
    db.exec('UPDATE clients SET latitude = 40.1, "distributorId" = NULL');
    expect((await service.findAll(undefined, undefined, undefined, undefined, true))[0]).toHaveProperty('lastVisitAt', null);
  });

  it('calculates separate arrivals for visible clients sharing an agent but using different radii', async () => {
    db.prepare('INSERT INTO clients VALUES (?, ?, ?, ?, ?)').run('client-2', 'agent-1', 40.1, 65.3, 100);
    visible.push(Object.assign(new Client(), visible[0], { id: 'client-2', orderRadiusMeters: 100 }));
    point('1', '2026-10-12T09:00:00Z', 40.11);
    point('2', '2026-10-12T09:05:00Z', 40.1006);
    point('3', '2026-10-12T09:10:00Z', 40.1);
    const result = await service.findAll(undefined, undefined, undefined, undefined, true);
    expect(result[0]).toHaveProperty('lastVisitAt', '2026-10-12T09:10:00.000Z');
    expect(result[1]).toHaveProperty('lastVisitAt', '2026-10-12T09:05:00.000Z');
  });

  it('uses recordedAt for offline GPS, and the existing 50m default for a null radius', async () => {
    db.exec('UPDATE clients SET "orderRadiusMeters" = NULL');
    point('1', '2026-10-10T10:00:00Z', 40.1006);
    point('2', '2026-10-10T10:05:00Z', 40.1);
    expect((await service.findAll(undefined, undefined, undefined, undefined, true))[0]).toHaveProperty('lastVisitAt', '2026-10-10T10:05:00.000Z');
  });

  it('counts the first recorded fix inside the radius without an earlier fix', async () => {
    point('first', '2026-10-12T09:00:00Z', 40.1);
    expect((await service.findAll(undefined, undefined, undefined, undefined, true))[0].lastVisitAt).toBe('2026-10-12T09:00:00.000Z');
  });

  it('orders equal recordedAt fixes by id when looking up the previous point', async () => {
    point('earlier', '2026-10-12T09:00:00Z', 40.1);
    point('same-a', '2026-10-12T10:00:00Z', 40.11);
    point('same-b', '2026-10-12T10:00:00Z', 40.1);
    point('stationary', '2026-10-12T11:00:00Z', 40.1001);
    expect((await service.findAll(undefined, undefined, undefined, undefined, true))[0].lastVisitAt).toBe('2026-10-12T10:00:00.000Z');
  });

  it('avoids expensive geography checks for distant history shared by many clients', async () => {
    for (let i = 1; i < 20; i++) {
      const id = `client-${i + 1}`;
      const latitude = 40.1 + i * 0.02;
      db.prepare('INSERT INTO clients VALUES (?, ?, ?, ?, ?)').run(id, 'agent-1', latitude, 65.3, 50);
      visible.push(Object.assign(new Client(), visible[0], { id, latitude }));
    }
    for (let i = 0; i < 1000; i++) point(`far-${i}`, '2026-10-10T09:00:00Z', 41.5);
    point('arrival', '2026-10-12T09:00:00Z', 40.1);
    point('stationary', '2026-10-12T09:05:00Z', 40.1001);

    const rows = await service.findAll(undefined, undefined, undefined, undefined, true);
    expect(rows[0].lastVisitAt).toBe('2026-10-12T09:00:00.000Z');
    expect(rows.slice(1).every(c => c.lastVisitAt === null)).toBe(true);
    expect(geographyChecks).toBeLessThan(200);
  });
});

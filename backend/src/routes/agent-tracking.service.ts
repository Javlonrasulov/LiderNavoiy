import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { Client } from '../clients/entities/client.entity';
import { DistributorProfile } from '../distributors/entities/distributor-profile.entity';
import { SalesLine } from '../lines/entities/sales-line.entity';
import { Order } from '../orders/entities/order.entity';
import { Visit } from '../visits/entities/visit.entity';
import { OrderSource, OrderStatus, VisitStatus } from '../common/enums';
import { RoutesService } from './routes.service';

export function trackingDay(date: string) {
  const from = new Date(`${date}T00:00:00+05:00`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? '') || !Number.isFinite(+from)
    || new Date(+from + 18_000_000).toISOString().slice(0, 10) !== date) {
    throw new BadRequestException('Sana YYYY-MM-DD shaklida bo‘lishi kerak');
  }
  return { from, to: new Date(+from + 86_400_000 - 1), weekday: new Date(`${date}T12:00:00Z`).getUTCDay() || 7 };
}

function coords(lat: number | null, lng: number | null) {
  return lat != null && lng != null && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))
    && Math.abs(Number(lat)) <= 90 && Math.abs(Number(lng)) <= 180 && !(Number(lat) === 0 && Number(lng) === 0);
}

function meters(a: { latitude: number | null; longitude: number | null }, b: { latitude: number | null; longitude: number | null }) {
  const rad = Math.PI / 180;
  const dlat = (Number(b.latitude) - Number(a.latitude)) * rad;
  const dlng = (Number(b.longitude) - Number(a.longitude)) * rad;
  const h = Math.sin(dlat / 2) ** 2 + Math.cos(Number(a.latitude) * rad) * Math.cos(Number(b.latitude) * rad) * Math.sin(dlng / 2) ** 2;
  return 12_742_000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface TrackingVisit {
  clientId: string; arrivedAt: string; departedAt: string; durationMinutes: number;
  evidence: 'gps_dwell' | 'check_in'; sequence: number;
}

@Injectable()
export class AgentTrackingService {
  constructor(
    @InjectRepository(DistributorProfile) private readonly profiles: Repository<DistributorProfile>,
    @InjectRepository(SalesLine) private readonly lines: Repository<SalesLine>,
    @InjectRepository(Client) private readonly clients: Repository<Client>,
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(Visit) private readonly visits: Repository<Visit>,
    private readonly routes: RoutesService,
  ) {}

  async getDaily(distributorId: string, date: string, permittedCompanies?: string[]) {
    const { from, to, weekday } = trackingDay(date);
    const profile = await this.profiles.findOne({ where: { id: distributorId }, relations: ['user'] });
    if (!profile) throw new NotFoundException('Agent topilmadi');
    const companies = [...new Set([profile.companyId, ...(profile.companyIds ?? [])].filter((c): c is string => !!c))]
      .filter(c => !permittedCompanies || permittedCompanies.includes(c));
    if (!companies.length) throw new NotFoundException('Agent tashkiloti topilmadi');
    const allLines = await this.lines.find({ where: { companyId: In(companies), isActive: true } });
    const lineByKey = new Map(allLines.map(l => [`${l.companyId}:${l.code}`, l]));
    const clientLine = (c: Client) => {
      const cids = [c.companyId, ...(c.linkedCompanyIds ?? []), ...(!c.companyId && c.distributorId === distributorId ? [profile.companyId] : [])];
      return cids.map(cid => lineByKey.get(`${cid}:${c.lineCode}`)).find(Boolean);
    };
    const names = [profile.user?.fullName, profile.user?.username].map(n => n?.trim()).filter(Boolean);
    const owned = allLines.filter(l => names.includes(l.agentName?.trim() ?? '') || (!l.agentName && l.code === profile.lineCode));
    const ownedCodes = owned.map(l => l.code);
    const qb = this.clients.createQueryBuilder('c')
      .where('(c.companyId IN (:...companies) OR c.linkedCompanyIds ?| ARRAY[:...companies]::text[] OR (c.companyId IS NULL AND c.distributorId = :distributorId))', { companies, distributorId })
      .andWhere('c.createdAt <= :to', { to })
      .andWhere('(c.deletedAt IS NULL OR c.deletedAt > :from)', { from })
      .andWhere('c.isActive = true');
    if (ownedCodes.length) qb.andWhere('(c.distributorId = :distributorId OR c.lineCode IN (:...ownedCodes))', { distributorId, ownedCodes });
    else qb.andWhere('c.distributorId = :distributorId', { distributorId });
    const candidates = await qb.orderBy('c.name', 'ASC').getMany();
    const planned = [...new Map(candidates.filter(c => {
      const line = clientLine(c);
      if (!line) return c.distributorId === distributorId;
      if (line.createdAt && +new Date(line.createdAt) > +to) return false;
      if (!owned.some(l => l.id === line.id) && line.agentName) return false;
      const days = line.agentVisitDays?.length ? line.agentVisitDays : line.visitDays;
      return !days?.length || days.map(Number).includes(weekday);
    }).map(c => [c.id, c])).values()];
    const [route, orderRows, visitRows] = await Promise.all([
      this.routes.getDailyRoute(distributorId, date),
      this.orders.find({ where: { distributorId, createdAt: Between(from, to) }, order: { createdAt: 'ASC' } }),
      this.visits.find({ where: { distributorId, visitedAt: Between(from, to) }, order: { visitedAt: 'ASC' } }),
    ]);
    const orderClientIds = [...new Set(orderRows.map(o => o.clientId))];
    const orderClients = orderClientIds.length ? await this.clients.find({ where: { id: In(orderClientIds) },
      select: { id: true, name: true, companyId: true, linkedCompanyIds: true, distributorId: true } }) : [];
    const orderClientById = new Map(orderClients.map(c => [c.id, c]));
    const validOrders = orderRows.filter(o => (o.companyId ? companies.includes(o.companyId) : (() => {
      const c = orderClientById.get(o.clientId);
      return !!c && (companies.includes(c.companyId ?? '') || c.linkedCompanyIds?.some(id => companies.includes(id))
        || (!c.companyId && c.distributorId === distributorId && companies.includes(profile.companyId ?? '')));
    })())
      && o.status !== OrderStatus.CANCELLED && o.status !== OrderStatus.DRAFT);
    // Returns reduce the monetary metric; an accepted order remains an order, as in CRM sales reports.
    const orderInfo = (o: Order) => ({ id: o.id, clientId: o.clientId, createdAt: new Date(o.createdAt).toISOString(),
      status: o.status, source: o.source, totalAmount: Number(o.totalAmount), returnedAmount: Number(o.returnedAmount || 0),
      netAmount: Math.max(0, Number(o.totalAmount) - Number(o.returnedAmount || 0)) });
    const ordersByClient = new Map<string, Order[]>();
    for (const o of validOrders) ordersByClient.set(o.clientId, [...(ordersByClient.get(o.clientId) ?? []), o]);
    const events: TrackingVisit[] = [];
    const unverified = new Set<string>();
    const changedCoordinates = new Set<string>();
    // Bucket GPS samples spatially; each shop scans only nearby fixes rather than the entire day's track.
    const grid = new Map<string, typeof route.points>();
    const ordinal = new Map(route.points.map((p, i) => [p, i]));
    const cell = (v: number) => Math.floor(v * 100);
    for (const p of route.points) {
      if (p.accuracy == null || !Number.isFinite(Number(p.accuracy)) || Number(p.accuracy) < 0 || Number(p.accuracy) > 50) continue;
      const key = `${cell(Number(p.latitude))}:${cell(Number(p.longitude))}`;
      const bucket = grid.get(key) ?? []; bucket.push(p); grid.set(key, bucket);
    }
    const nearbyByClient = new Map<string, typeof route.points>();
    const fixOwners = new Map<(typeof route.points)[number], Set<string>>();
    for (const c of planned) {
      if (!coords(c.latitude, c.longitude) || (c.locationUpdatedAt && +new Date(c.locationUpdatedAt) > +to)) continue;
      const radius = Math.max(10, Number(c.orderRadiusMeters) || 50);
      const nearby: typeof route.points = [];
      const latCells = Math.ceil(radius / 1110) + 1;
      const lngCells = Math.ceil(radius / (1110 * Math.cos(Number(c.latitude) * Math.PI / 180))) + 1;
      if (radius > 5000) nearby.push(...[...grid.values()].flat());
      else for (let x = cell(Number(c.latitude)) - latCells; x <= cell(Number(c.latitude)) + latCells; x++) {
        for (let y = cell(Number(c.longitude)) - lngCells; y <= cell(Number(c.longitude)) + lngCells; y++) nearby.push(...(grid.get(`${x}:${y}`) ?? []));
      }
      nearby.sort((a, b) => +new Date(a.recordedAt) - +new Date(b.recordedAt));
      nearbyByClient.set(c.id, nearby);
      for (const p of nearby) {
        if (meters(c, p) + Number(p.accuracy) > radius) continue;
        const owners = fixOwners.get(p) ?? new Set<string>(); owners.add(c.id); fixOwners.set(p, owners);
      }
    }
    for (const c of planned) {
      if (!coords(c.latitude, c.longitude)) { unverified.add(c.id); continue; }
      if (c.locationUpdatedAt && +new Date(c.locationUpdatedAt) > +to) {
        unverified.add(c.id); changedCoordinates.add(c.id); continue;
      }
      const radius = Math.max(10, Number(c.orderRadiusMeters) || 50);
      const nearby = nearbyByClient.get(c.id) ?? [];
      let episode: typeof route.points = [];
      const close = () => {
        if (episode.length >= 2 && +new Date(episode[episode.length - 1].recordedAt) - +new Date(episode[0].recordedAt) >= 30_000) {
          const start = new Date(episode[0].recordedAt), end = new Date(episode[episode.length - 1].recordedAt);
          events.push({ clientId: c.id, arrivedAt: start.toISOString(), departedAt: end.toISOString(),
            durationMinutes: Math.round((+end - +start) / 6000) / 10, evidence: 'gps_dwell', sequence: 0 });
        } else if (episode.length) unverified.add(c.id);
        episode = [];
      };
      for (const p of nearby) {
        // Overlapping shop geofences do not identify which shop was entered; require an explicit check-in.
        if ((fixOwners.get(p)?.size ?? 0) > 1) { unverified.add(c.id); close(); continue; }
        if (meters(c, p) + Number(p.accuracy) > radius) { close(); continue; }
        if (episode.length && (+new Date(p.recordedAt) - +new Date(episode[episode.length - 1].recordedAt) > 300_000
          || ordinal.get(p)! !== ordinal.get(episode[episode.length - 1])! + 1)) close();
        episode.push(p);
      }
      close();
      for (const v of visitRows.filter(v => v.clientId === c.id && v.status === VisitStatus.COMPLETED && !v.notes?.startsWith('client_order:'))) {
        if (!coords(v.checkInLatitude, v.checkInLongitude)
          || meters(c, { latitude: v.checkInLatitude, longitude: v.checkInLongitude }) > radius) { unverified.add(c.id); continue; }
        const corroborated = nearby.some(p => Math.abs(+new Date(p.recordedAt) - +new Date(v.visitedAt)) <= 120_000 && meters(c, p) + Number(p.accuracy) <= radius);
        if (!corroborated) { unverified.add(c.id); continue; }
        const at = new Date(v.visitedAt).toISOString();
        if (!events.some(e => e.clientId === c.id && Math.abs(+new Date(e.arrivedAt) - +new Date(at)) < 300_000)) {
          events.push({ clientId: c.id, arrivedAt: at, departedAt: at, durationMinutes: 0, evidence: 'check_in', sequence: 0 });
        }
      }
    }
    events.sort((a, b) => a.arrivedAt.localeCompare(b.arrivedAt));
    events.forEach((e, i) => { e.sequence = i + 1; unverified.delete(e.clientId); });
    const eventsByClient = new Map<string, TrackingVisit[]>();
    for (const e of events) eventsByClient.set(e.clientId, [...(eventsByClient.get(e.clientId) ?? []), e]);
    const points = planned.map((c, i) => {
      const visits = eventsByClient.get(c.id) ?? [];
      const orders = ordersByClient.get(c.id) ?? [];
      const agentOrders = orders.filter(o => o.source === OrderSource.AGENT);
      const line = clientLine(c);
      return { idx: i + 1, clientId: c.id, name: c.name, address: c.address ?? '', lineName: line?.name ?? c.lineCode ?? '—',
        lat: c.latitude, lng: c.longitude, hasCoords: coords(c.latitude, c.longitude), visits, orders: orders.map(orderInfo),
        visitUnverified: unverified.has(c.id), status: visits.length ? (agentOrders.length ? 'ordered' : 'visited') : (agentOrders.length ? 'remote_ordered' : 'missed') };
    });
    const clientOrders = validOrders.filter(o => o.source === OrderSource.CLIENT).map(o => ({ ...orderInfo(o),
      clientName: orderClientById.get(o.clientId)?.name ?? null }));
    const warnings: string[] = [];
    if (date < new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent' }).format(new Date())) {
      warnings.push('Tarixiy biriktirishlar saqlanmagan: reja joriy Liniya va mijoz biriktirishlari asosida, yaratilish/o‘chirilish sanalarini hisobga olib ko‘rsatildi.');
    }
    if (unverified.size) warnings.push(`${unverified.size} mijozda tashrif GPS bilan tasdiqlanmadi. Tasdiqlanmagan tashriflar “borildi” deb hisoblanmaydi.`);
    if (changedCoordinates.size) warnings.push(`${changedCoordinates.size} mijozning koordinatasi tanlangan kundan keyin o‘zgargan. Eski koordinata tarixi bo‘lmagani uchun tashrif hisoblanmadi.`);
    let observedMs = 0;
    let distanceMeters = 0;
    const gpsTrail = route.points.map((p, i, all) => {
      const gap = i > 0 ? +new Date(p.recordedAt) - +new Date(all[i - 1].recordedAt) : 0;
      if (gap > 0 && gap <= 300_000) { observedMs += gap; distanceMeters += meters(all[i - 1], p); }
      return { lat: Number(p.latitude), lng: Number(p.longitude), recordedAt: new Date(p.recordedAt).toISOString(), breakBefore: i > 0 && gap > 300_000 };
    });
    return { date, distributorId, points, visits: events, clientOrders, gpsTrail, warnings,
      stats: { total: points.length, ordered: points.filter(p => p.status === 'ordered').length,
        visited: points.filter(p => p.status === 'visited').length, remoteOrdered: points.filter(p => p.status === 'remote_ordered').length,
        missed: points.filter(p => p.status === 'missed').length, noGps: points.filter(p => !p.hasCoords).length,
        clientOrdered: clientOrders.length, unverified: unverified.size,
        totalDistanceKm: Math.round(distanceMeters / 100) / 10, observedMinutes: Math.round(observedMs / 60_000) } };
  }
}

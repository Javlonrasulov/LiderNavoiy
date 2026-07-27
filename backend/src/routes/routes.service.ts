import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { LocationPoint } from '../gps/entities/location-point.entity';

/** Markaziy Osiyo (O'zbekiston + buffer) — emulator/US default nuqtalarni chiqarib tashlash */
const REGION_LAT_MIN = 37;
const REGION_LAT_MAX = 45.8;
const REGION_LNG_MIN = 55;
const REGION_LNG_MAX = 73.5;

/** Ketma-ket nuqtalar orasidagi maksimal sakrash (km) — undan katta = GPS xato */
const MAX_JUMP_KM = 80;

/** Vaqt bo'yicha maksimal tezlik (km/soat) */
const MAX_SPEED_KMH = 160;

@Injectable()
export class RoutesService {
  constructor(
    @InjectRepository(LocationPoint)
    private readonly locationRepo: Repository<LocationPoint>,
  ) {}

  async getDailyRoute(distributorId: string, date: string) {
    const from = new Date(`${date}T00:00:00+05:00`);
    const to = new Date(`${date}T23:59:59.999+05:00`);

    const raw = await this.locationRepo.find({
      where: { distributorId, recordedAt: Between(from, to) },
      order: { recordedAt: 'ASC' },
    });

    const points = this.sanitizeTrack(raw);
    const stats = this.calculateStats(points);
    return { date, distributorId, pointCount: points.length, stats, points };
  }

  async getWeeklyRoute(distributorId: string, weekStart: string) {
    const from = new Date(weekStart);
    const to = new Date(from);
    to.setDate(to.getDate() + 7);

    const raw = await this.locationRepo.find({
      where: { distributorId, recordedAt: Between(from, to) },
      order: { recordedAt: 'ASC' },
    });

    const points = this.sanitizeTrack(raw);

    const byDay: Record<string, LocationPoint[]> = {};
    for (const p of points) {
      const day = p.recordedAt.toISOString().split('T')[0];
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(p);
    }

    const days = Object.entries(byDay).map(([date, dayPoints]) => ({
      date,
      pointCount: dayPoints.length,
      stats: this.calculateStats(dayPoints),
    }));

    return { distributorId, weekStart, days, totalPoints: points.length };
  }

  /**
   * Yolg'on GPS: 0,0 / mintaqadan tashqari / teleport sakrashlarini olib tashlaydi.
   * Masalan: birinchi fix Amerika, keyin Navoiy → chiziq Yer bo'ylab chizilmasin.
   */
  sanitizeTrack(points: LocationPoint[]): LocationPoint[] {
    const out: LocationPoint[] = [];

    for (const p of points) {
      const lat = Number(p.latitude);
      const lng = Number(p.longitude);
      if (!this.isPlausibleCoord(lat, lng)) continue;

      if (out.length === 0) {
        out.push(p);
        continue;
      }

      const prev = out[out.length - 1];
      const distKm = this.haversine(
        Number(prev.latitude),
        Number(prev.longitude),
        lat,
        lng,
      );

      if (distKm > MAX_JUMP_KM) continue;

      const dtMs =
        new Date(p.recordedAt).getTime() - new Date(prev.recordedAt).getTime();
      if (dtMs > 0) {
        const hours = dtMs / 3_600_000;
        if (hours > 0 && distKm / hours > MAX_SPEED_KMH) continue;
      }

      out.push(p);
    }

    return out;
  }

  private isPlausibleCoord(lat: number, lng: number): boolean {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
    if (lat === 0 && lng === 0) return false;
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return false;
    // Markaziy Osiyo tashqarisidagi nuqtalar (emulator / eski last-known)
    if (lat < REGION_LAT_MIN || lat > REGION_LAT_MAX) return false;
    if (lng < REGION_LNG_MIN || lng > REGION_LNG_MAX) return false;
    return true;
  }

  private calculateStats(points: LocationPoint[]) {
    if (points.length === 0) {
      return { totalDistanceKm: 0, avgSpeed: 0, maxSpeed: 0, durationMinutes: 0 };
    }

    let totalDistance = 0;
    let maxSpeed = 0;
    let speedSum = 0;
    let speedCount = 0;

    for (let i = 1; i < points.length; i++) {
      const d = this.haversine(
        Number(points[i - 1].latitude),
        Number(points[i - 1].longitude),
        Number(points[i].latitude),
        Number(points[i].longitude),
      );
      // sanitizeTrack dan keyin ham himoya
      if (d <= MAX_JUMP_KM) totalDistance += d;

      if (points[i].speed != null) {
        speedSum += points[i].speed!;
        speedCount++;
        maxSpeed = Math.max(maxSpeed, points[i].speed!);
      }
    }

    const durationMs =
      points[points.length - 1].recordedAt.getTime() - points[0].recordedAt.getTime();

    return {
      totalDistanceKm: Math.round(totalDistance * 100) / 100,
      avgSpeed: speedCount > 0 ? Math.round((speedSum / speedCount) * 10) / 10 : 0,
      maxSpeed: Math.round(maxSpeed * 10) / 10,
      durationMinutes: Math.round(durationMs / 60000),
    };
  }

  private haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}

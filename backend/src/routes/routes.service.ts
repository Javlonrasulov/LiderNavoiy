import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { LocationPoint } from '../gps/entities/location-point.entity';

@Injectable()
export class RoutesService {
  constructor(
    @InjectRepository(LocationPoint)
    private readonly locationRepo: Repository<LocationPoint>,
  ) {}

  async getDailyRoute(distributorId: string, date: string) {
    const from = new Date(`${date}T00:00:00+05:00`);
    const to = new Date(`${date}T23:59:59.999+05:00`);

    const points = await this.locationRepo.find({
      where: { distributorId, recordedAt: Between(from, to) },
      order: { recordedAt: 'ASC' },
    });

    const stats = this.calculateStats(points);
    return { date, distributorId, pointCount: points.length, stats, points };
  }

  async getWeeklyRoute(distributorId: string, weekStart: string) {
    const from = new Date(weekStart);
    const to = new Date(from);
    to.setDate(to.getDate() + 7);

    const points = await this.locationRepo.find({
      where: { distributorId, recordedAt: Between(from, to) },
      order: { recordedAt: 'ASC' },
    });

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

  private calculateStats(points: LocationPoint[]) {
    if (points.length === 0) {
      return { totalDistanceKm: 0, avgSpeed: 0, maxSpeed: 0, durationMinutes: 0 };
    }

    let totalDistance = 0;
    let maxSpeed = 0;
    let speedSum = 0;
    let speedCount = 0;

    for (let i = 1; i < points.length; i++) {
      totalDistance += this.haversine(
        points[i - 1].latitude,
        points[i - 1].longitude,
        points[i].latitude,
        points[i].longitude,
      );
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
      avgSpeed: speedCount > 0 ? Math.round(speedSum / speedCount * 10) / 10 : 0,
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

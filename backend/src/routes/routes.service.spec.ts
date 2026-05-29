import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RoutesService } from './routes.service';
import { LocationPoint } from '../gps/entities/location-point.entity';

describe('RoutesService', () => {
  let service: RoutesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoutesService,
        {
          provide: getRepositoryToken(LocationPoint),
          useValue: { find: jest.fn().mockResolvedValue([]) },
        },
      ],
    }).compile();

    service = module.get(RoutesService);
  });

  it('should return empty stats for no points', async () => {
    const result = await service.getDailyRoute('dist-1', '2026-05-29');
    expect(result.pointCount).toBe(0);
    expect(result.stats.totalDistanceKm).toBe(0);
  });
});

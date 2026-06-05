import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { getTashkentTime } from '../common/time/tashkent-time';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'distributor-crm-api',
    };
  }

  @Get('time')
  getTashkentTime() {
    return getTashkentTime();
  }
}

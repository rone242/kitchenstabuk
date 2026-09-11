import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/auth.decorators.js';

@Controller('health')
export class HealthController {
  @Get()
  @Public()
  check(): { status: 'ok'; timestamp: string; uptimeSeconds: number } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }
}

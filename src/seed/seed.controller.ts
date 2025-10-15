import { Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SeedService } from './seed.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('seed')
@Controller('seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Post()
  @Public()
  @ApiOperation({ summary: 'Seed database with initial data' })
  @ApiResponse({ status: 201, description: 'Database seeded successfully' })
  seed() {
    return this.seedService.seed();
  }

  @Post('clear')
  @Public()
  @ApiOperation({ summary: 'Clear all data from the database' })
  @ApiResponse({ status: 200, description: 'Database cleared successfully' })
  clearDatabase() {
    return this.seedService.clearDatabase();
  }
}
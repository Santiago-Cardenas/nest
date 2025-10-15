import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { SeedController } from './seed.controller';
import { User } from '../users/entities/user.entity';
import { Book } from '../books/entities/book.entity';
import { Copy } from '../copies/entities/copy.entity';
import { Reservation } from '../reservations/entities/reservation.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Book, Copy, Reservation])],
  controllers: [SeedController],
  providers: [SeedService],
})
export class SeedModule {}
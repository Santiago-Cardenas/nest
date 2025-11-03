import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CopiesService } from './copies.service';
import { CopiesController } from './copies.controller';
import { Copy } from './entities/copy.entity';
import { BooksModule } from '../books/books.module';
import { Reservation } from '../reservations/entities/reservation.entity';
import { Loan } from '../loans/entities/loan.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Copy, Reservation, Loan]), BooksModule],
  controllers: [CopiesController],
  providers: [CopiesService],
  exports: [CopiesService],
})
export class CopiesModule {}
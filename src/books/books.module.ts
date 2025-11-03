import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BooksService } from './books.service';
import { BooksController } from './books.controller';
import { Book } from './entities/book.entity';
import { Copy } from '../copies/entities/copy.entity';
import { Loan } from '../loans/entities/loan.entity';
import { Reservation } from '../reservations/entities/reservation.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Book, Copy, Loan, Reservation])],
  controllers: [BooksController],
  providers: [BooksService],
  exports: [BooksService],
})
export class BooksModule {}
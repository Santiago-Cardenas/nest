import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GoogleBooksService } from './google-books.service';
import { GoogleBooksController } from './google-books.controller';
import { BooksModule } from '../books/books.module';

@Module({
  imports: [HttpModule, BooksModule],
  controllers: [GoogleBooksController],
  providers: [GoogleBooksService],
})
export class GoogleBooksModule {}
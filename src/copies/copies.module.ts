import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CopiesService } from './copies.service';
import { CopiesController } from './copies.controller';
import { Copy } from './entities/copy.entity';
import { BooksModule } from '../books/books.module';

@Module({
  imports: [TypeOrmModule.forFeature([Copy]), BooksModule],
  controllers: [CopiesController],
  providers: [CopiesService],
  exports: [CopiesService],
})
export class CopiesModule {}
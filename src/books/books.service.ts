import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { Book } from './entities/book.entity';
import { Copy } from '../copies/entities/copy.entity';
import { Loan } from '../loans/entities/loan.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';

@Injectable()
export class BooksService {
  constructor(
    @InjectRepository(Book)
    private booksRepository: Repository<Book>,
    @InjectRepository(Copy)
    private copiesRepository: Repository<Copy>,
    @InjectRepository(Loan)
    private loansRepository: Repository<Loan>,
    @InjectRepository(Reservation)
    private reservationsRepository: Repository<Reservation>,
  ) {}

  async create(createBookDto: CreateBookDto): Promise<Book> {
    const existingBook = await this.booksRepository.findOne({
      where: { isbn: createBookDto.isbn },
    });

    if (existingBook) {
      throw new ConflictException('Book with this ISBN already exists');
    }

    const book = this.booksRepository.create(createBookDto);
    return this.booksRepository.save(book);
  }

  async findAll(search?: string): Promise<Book[]> {
    if (search) {
      return this.booksRepository.find({
        where: [
          { title: Like(`%${search}%`) },
          { author: Like(`%${search}%`) },
          { isbn: Like(`%${search}%`) },
        ],
        relations: ['copies'],
      });
    }

    return this.booksRepository.find({ relations: ['copies'] });
  }

  async findOne(id: string): Promise<Book> {
    const book = await this.booksRepository.findOne({
      where: { id },
      relations: ['copies'],
    });

    if (!book) {
      throw new NotFoundException('Book not found');
    }

    return book;
  }

  async findByIsbn(isbn: string): Promise<Book | null> {
    return this.booksRepository.findOne({
      where: { isbn },
      relations: ['copies'],
    });
  }

  async update(id: string, updateBookDto: UpdateBookDto): Promise<Book> {
    const book = await this.findOne(id);

    if (updateBookDto.isbn && updateBookDto.isbn !== book.isbn) {
      const existingBook = await this.findByIsbn(updateBookDto.isbn);
      if (existingBook) {
        throw new ConflictException('Book with this ISBN already exists');
      }
    }

    Object.assign(book, updateBookDto);
    return this.booksRepository.save(book);
  }

  async remove(id: string): Promise<void> {
    // Ensure the book exists
    await this.findOne(id);

    // Perform deletions inside a transaction to keep DB consistent
    await this.booksRepository.manager.transaction(async (manager) => {
      // Find copies for the book
      const copies = await manager.find(Copy, {
        where: { bookId: id } as any,
        select: ['id'],
      });

      const copyIds = copies.map((c: any) => c.id);

      if (copyIds.length > 0) {
        // Delete reservations and loans referencing those copies
  await manager.delete(Reservation, { copyId: In(copyIds) });
  await manager.delete(Loan, { copyId: In(copyIds) });

  // Delete the copies themselves
  await manager.delete(Copy, { id: In(copyIds) });
      }

      // Finally delete the book
      await manager.delete(Book, { id });
    });
  }
}
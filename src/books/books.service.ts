import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Book } from './entities/book.entity';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';

@Injectable()
export class BooksService {
  constructor(
    @InjectRepository(Book)
    private booksRepository: Repository<Book>,
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
    const book = await this.findOne(id);
    await this.booksRepository.remove(book);
  }
}
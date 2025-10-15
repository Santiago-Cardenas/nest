import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Copy, CopyStatus } from './entities/copy.entity';
import { CreateCopyDto } from './dto/create-copy.dto';
import { UpdateCopyDto } from './dto/update-copy.dto';
import { BooksService } from '../books/books.service';

@Injectable()
export class CopiesService {
  constructor(
    @InjectRepository(Copy)
    private copiesRepository: Repository<Copy>,
    private booksService: BooksService,
  ) {}

  async create(createCopyDto: CreateCopyDto): Promise<Copy> {
    const existingCopy = await this.copiesRepository.findOne({
      where: { code: createCopyDto.code },
    });

    if (existingCopy) {
      throw new ConflictException('Copy with this code already exists');
    }

    await this.booksService.findOne(createCopyDto.bookId);

    const copy = this.copiesRepository.create(createCopyDto);
    return this.copiesRepository.save(copy);
  }

  async findAll(): Promise<Copy[]> {
    return this.copiesRepository.find({ relations: ['book'] });
  }

  async findAvailable(): Promise<Copy[]> {
    return this.copiesRepository.find({
      where: { status: CopyStatus.AVAILABLE },
      relations: ['book'],
    });
  }

  async findOne(id: string): Promise<Copy> {
    const copy = await this.copiesRepository.findOne({
      where: { id },
      relations: ['book', 'loans', 'reservations'],
    });

    if (!copy) {
      throw new NotFoundException('Copy not found');
    }

    return copy;
  }

  async update(id: string, updateCopyDto: UpdateCopyDto): Promise<Copy> {
    const copy = await this.findOne(id);

    if (updateCopyDto.bookId && updateCopyDto.bookId !== copy.bookId) {
      await this.booksService.findOne(updateCopyDto.bookId);
    }

    if (updateCopyDto.code && updateCopyDto.code !== copy.code) {
      const existingCopy = await this.copiesRepository.findOne({
        where: { code: updateCopyDto.code },
      });
      if (existingCopy) {
        throw new ConflictException('Copy with this code already exists');
      }
    }

    Object.assign(copy, updateCopyDto);
    return this.copiesRepository.save(copy);
  }

  async updateStatus(id: string, status: CopyStatus): Promise<Copy> {
    const copy = await this.findOne(id);
    copy.status = status;
    return this.copiesRepository.save(copy);
  }

  async remove(id: string): Promise<void> {
    const copy = await this.findOne(id);
    await this.copiesRepository.remove(copy);
  }
}
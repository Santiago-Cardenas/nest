import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Copy, CopyStatus } from './entities/copy.entity';
import { CreateCopyDto } from './dto/create-copy.dto';
import { UpdateCopyDto } from './dto/update-copy.dto';
import { BooksService } from '../books/books.service';
import { Reservation, ReservationStatus } from '../reservations/entities/reservation.entity';
import { Loan } from '../loans/entities/loan.entity';

@Injectable()
export class CopiesService {
  constructor(
    @InjectRepository(Copy)
    private copiesRepository: Repository<Copy>,
    @InjectRepository(Reservation)
    private reservationsRepository: Repository<Reservation>,
    @InjectRepository(Loan)
    private loansRepository: Repository<Loan>,
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
    const copies = await this.copiesRepository.find({ relations: ['book'] });
    // Excluir copias marcadas como DELETED
    return copies.filter((c) => c.status !== CopyStatus.DELETED);
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

    if (copy.status === CopyStatus.DELETED) {
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

    // If marking as DELETED, cancel reservations and delete loans referencing this copy
    if (status === CopyStatus.DELETED) {
      await this.copiesRepository.manager.transaction(async (manager) => {
        // Cancel pending reservations for this copy (set to CANCELLED). Do NOT change copy status to AVAILABLE.
        await manager.update(
          Reservation,
          { copyId: id, status: ReservationStatus.PENDING },
          { status: ReservationStatus.CANCELLED },
        );

        // Delete all loans referencing this copy
        await manager.delete(Loan, { copyId: id });

        // Finally mark the copy as DELETED
        await manager.update(Copy, { id }, { status: CopyStatus.DELETED });
      });

      // Return the updated copy (fetch fresh)
      const updated = await this.copiesRepository.findOne({ where: { id } });
      return updated as Copy;
    }

    copy.status = status;
    return this.copiesRepository.save(copy);
  }

  async remove(id: string): Promise<void> {
    // Reuse updateStatus to perform the proper cleanup when deleting
    await this.updateStatus(id, CopyStatus.DELETED);
  }
}
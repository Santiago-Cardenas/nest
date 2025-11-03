import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Copy, CopyStatus } from './entities/copy.entity';
import { Reservation, ReservationStatus } from '../reservations/entities/reservation.entity';
import { Loan, LoanStatus } from '../loans/entities/loan.entity';
import { CreateCopyDto } from './dto/create-copy.dto';
import { UpdateCopyDto } from './dto/update-copy.dto';
import { BooksService } from '../books/books.service';

@Injectable()
export class CopiesService {
  constructor(
    @InjectRepository(Copy)
    private copiesRepository: Repository<Copy>,
    private booksService: BooksService,
    @InjectRepository(Reservation)
    private reservationsRepository: Repository<Reservation>,
    @InjectRepository(Loan)
    private loansRepository: Repository<Loan>,
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

    // Buscar reservas relacionadas
    const reservations = await this.reservationsRepository.find({ where: { copyId: id } });

    // Si hay reservas pendientes, no permitimos eliminar la copia
    const hasPendingReservation = reservations.some(
      (r) => r.status === ReservationStatus.PENDING,
    );
    if (hasPendingReservation) {
      throw new BadRequestException('Cannot delete copy with pending reservations');
    }

    // Buscar préstamos relacionados
    const loans = await this.loansRepository.find({ where: { copyId: id } });

    // Si hay préstamos activos u overdue, no permitimos eliminar la copia
    const hasActiveLoan = loans.some(
      (l) => l.status === LoanStatus.ACTIVE || l.status === LoanStatus.OVERDUE,
    );
    if (hasActiveLoan) {
      throw new BadRequestException('Cannot delete copy with active or overdue loans');
    }

    // Crear un "dummy" copy para reemplazar referencias históricas (fulfilled/returned/cancelled/expired)
    const dummyCode = `dummy-${copy.id}`;
    const dummyCopy = this.copiesRepository.create({
      code: dummyCode,
      bookId: copy.bookId,
      status: CopyStatus.AVAILABLE,
    });

    const savedDummy = await this.copiesRepository.save(dummyCopy);

    // Reasignar reservas (no pendientes) al dummy
    for (const reservation of reservations) {
      // Solo reasignar reservas no pendientes (fulfilled/cancelled/expired)
      if (reservation.status !== ReservationStatus.PENDING) {
        reservation.copyId = savedDummy.id;
        await this.reservationsRepository.save(reservation);
      }
    }

    // Reasignar préstamos (no activos/overdue) al dummy
    for (const loan of loans) {
      if (loan.status === LoanStatus.RETURNED) {
        loan.copyId = savedDummy.id;
        await this.loansRepository.save(loan);
      }
    }

    await this.copiesRepository.remove(copy);
  }
}
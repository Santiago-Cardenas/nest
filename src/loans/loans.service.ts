import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Loan, LoanStatus } from './entities/loan.entity';
import { CreateLoanDto } from './dto/create-loan.dto';
import { CopiesService } from '../copies/copies.service';
import { CopyStatus } from '../copies/entities/copy.entity';
import { ReservationsService } from '../reservations/reservations.service';
import { ReservationStatus } from '../reservations/entities/reservation.entity';

@Injectable()
export class LoansService {
  private readonly LOAN_DURATION_DAYS = 14;
  private readonly FINE_PER_DAY = 1000; // $1000 COP per day

  constructor(
    @InjectRepository(Loan)
    private loansRepository: Repository<Loan>,
    private copiesService: CopiesService,
    private reservationsService: ReservationsService,
  ) {}

  async create(userId: string, createLoanDto: CreateLoanDto): Promise<Loan> {
    const copy = await this.copiesService.findOne(createLoanDto.copyId);

    // Verificar si hay una reserva pendiente para este ejemplar
    const pendingReservation = await this.reservationsService.findPendingReservationByCopy(
      createLoanDto.copyId,
    );

    if (pendingReservation) {
      // Solo el usuario que reservó puede tomar prestado el libro
      if (pendingReservation.userId !== userId) {
        throw new BadRequestException(
          'This copy is reserved by another user. Please choose a different copy.',
        );
      }

      // Marcar la reserva como cumplida
      await this.reservationsService.fulfillReservation(pendingReservation.id);
    } else {
      // Si no hay reserva, el ejemplar debe estar disponible
      if (copy.status !== CopyStatus.AVAILABLE) {
        throw new BadRequestException(
          `Copy is not available for loan. Current status: ${copy.status}`,
        );
      }
    }

    // Verificar límite de préstamos activos por usuario
    const activeLoans = await this.loansRepository.count({
      where: {
        userId,
        status: LoanStatus.ACTIVE,
      },
    });

    if (activeLoans >= 3) {
      throw new BadRequestException(
        'User has reached maximum active loans (3)',
      );
    }

    // Crear el préstamo
    const loanDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + this.LOAN_DURATION_DAYS);

    const loan = this.loansRepository.create({
      userId,
      copyId: createLoanDto.copyId,
      loanDate,
      dueDate,
      notes: createLoanDto.notes,
      status: LoanStatus.ACTIVE,
    });

    // Actualizar estado del ejemplar
    await this.copiesService.updateStatus(copy.id, CopyStatus.BORROWED);

    return this.loansRepository.save(loan);
  }

  async findAll(): Promise<Loan[]> {
    return this.loansRepository.find({
      relations: ['user', 'copy', 'copy.book'],
      order: { createdAt: 'DESC' },
    });
  }

  async findUserLoans(userId: string): Promise<Loan[]> {
    return this.loansRepository.find({
      where: { userId },
      relations: ['copy', 'copy.book'],
      order: { createdAt: 'DESC' },
    });
  }

  async findActiveLoans(): Promise<Loan[]> {
    return this.loansRepository.find({
      where: { status: LoanStatus.ACTIVE },
      relations: ['user', 'copy', 'copy.book'],
      order: { dueDate: 'ASC' },
    });
  }

  async findOverdueLoans(): Promise<Loan[]> {
    return this.loansRepository.find({
      where: { status: LoanStatus.OVERDUE },
      relations: ['user', 'copy', 'copy.book'],
      order: { dueDate: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Loan> {
    const loan = await this.loansRepository.findOne({
      where: { id },
      relations: ['user', 'copy', 'copy.book'],
    });

    if (!loan) {
      throw new NotFoundException('Loan not found');
    }

    return loan;
  }

  async returnLoan(id: string): Promise<Loan> {
    const loan = await this.findOne(id);

    if (loan.status !== LoanStatus.ACTIVE && loan.status !== LoanStatus.OVERDUE) {
      throw new BadRequestException(
        `Loan cannot be returned. Current status: ${loan.status}`,
      );
    }

    const returnDate = new Date();
    loan.returnDate = returnDate;
    loan.status = LoanStatus.RETURNED;

    // Calcular multa si hay retraso
    if (returnDate > loan.dueDate) {
      const daysLate = Math.ceil(
        (returnDate.getTime() - loan.dueDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      loan.fine = daysLate * this.FINE_PER_DAY;
    }

    // Liberar el ejemplar
    await this.copiesService.updateStatus(loan.copyId, CopyStatus.AVAILABLE);

    return this.loansRepository.save(loan);
  }

  async updateOverdueLoans(): Promise<void> {
    const overdueLoans = await this.loansRepository.find({
      where: {
        status: LoanStatus.ACTIVE,
        dueDate: MoreThan(new Date()),
      },
    });

    for (const loan of overdueLoans) {
      loan.status = LoanStatus.OVERDUE;
      await this.loansRepository.save(loan);
    }
  }

  // Estadísticas de préstamos
  async getLoanStats(): Promise<{
    total: number;
    active: number;
    overdue: number;
    returned: number;
  }> {
    const [total, active, overdue, returned] = await Promise.all([
      this.loansRepository.count(),
      this.loansRepository.count({ where: { status: LoanStatus.ACTIVE } }),
      this.loansRepository.count({ where: { status: LoanStatus.OVERDUE } }),
      this.loansRepository.count({ where: { status: LoanStatus.RETURNED } }),
    ]);

    return {
      total,
      active,
      overdue,
      returned,
    };
  }

  async remove(id: string): Promise<void> {
    const loan = await this.findOne(id);

    if (loan.status === LoanStatus.ACTIVE || loan.status === LoanStatus.OVERDUE) {
      await this.copiesService.updateStatus(loan.copyId, CopyStatus.AVAILABLE);
    }

    await this.loansRepository.delete(id);
  }
}
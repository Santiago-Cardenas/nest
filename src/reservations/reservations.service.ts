import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Reservation, ReservationStatus } from './entities/reservation.entity';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { CopiesService } from '../copies/copies.service';
import { CopyStatus } from '../copies/entities/copy.entity';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class ReservationsService {
  private readonly RESERVATION_DURATION_HOURS = 48; // 48 horas para recoger
  private readonly MAX_ACTIVE_RESERVATIONS = 3;

  constructor(
    @InjectRepository(Reservation)
    private reservationsRepository: Repository<Reservation>,
    private copiesService: CopiesService,
  ) {}

  async create(
    userId: string,
    createReservationDto: CreateReservationDto,
  ): Promise<Reservation> {
    // Verificar que el ejemplar existe y está disponible
    const copy = await this.copiesService.findOne(createReservationDto.copyId);

    if (copy.status !== CopyStatus.AVAILABLE) {
      throw new BadRequestException(
        'Copy is not available for reservation. Current status: ' + copy.status,
      );
    }

    // Verificar límite de reservas activas por usuario
    const activeReservations = await this.reservationsRepository.count({
      where: {
        userId,
        status: ReservationStatus.PENDING,
      },
    });

    if (activeReservations >= this.MAX_ACTIVE_RESERVATIONS) {
      throw new BadRequestException(
        `User has reached maximum active reservations (${this.MAX_ACTIVE_RESERVATIONS})`,
      );
    }

    // Verificar si ya existe una reserva activa para este ejemplar
    const existingReservation = await this.reservationsRepository.findOne({
      where: {
        copyId: createReservationDto.copyId,
        status: ReservationStatus.PENDING,
      },
    });

    if (existingReservation) {
      throw new ConflictException('This copy already has an active reservation');
    }

    // Calcular fechas
    const reservationDate = new Date();
    const expirationDate = createReservationDto.expirationDate
      ? new Date(createReservationDto.expirationDate)
      : new Date(
          reservationDate.getTime() +
            this.RESERVATION_DURATION_HOURS * 60 * 60 * 1000,
        );

    // Validar que la fecha de expiración sea futura
    if (expirationDate <= reservationDate) {
      throw new BadRequestException('Expiration date must be in the future');
    }

    // Crear la reserva
    const reservation = this.reservationsRepository.create({
      userId,
      copyId: createReservationDto.copyId,
      reservationDate,
      expirationDate,
      status: ReservationStatus.PENDING,
    });

    // Actualizar estado del ejemplar
    await this.copiesService.updateStatus(copy.id, CopyStatus.RESERVED);

    return this.reservationsRepository.save(reservation);
  }

  async findAll(): Promise<Reservation[]> {
    return this.reservationsRepository.find({
      relations: ['user', 'copy', 'copy.book'],
      order: { reservationDate: 'DESC' },
    });
  }

  async findUserReservations(userId: string): Promise<Reservation[]> {
    return this.reservationsRepository.find({
      where: { userId },
      relations: ['copy', 'copy.book'],
      order: { reservationDate: 'DESC' },
    });
  }

  async findPendingReservations(): Promise<Reservation[]> {
    return this.reservationsRepository.find({
      where: { status: ReservationStatus.PENDING },
      relations: ['user', 'copy', 'copy.book'],
      order: { reservationDate: 'ASC' },
    });
  }

  async findPendingReservationByCopy(copyId: string): Promise<Reservation | null> {
    return this.reservationsRepository.findOne({
      where: { copyId, status: ReservationStatus.PENDING },
      relations: ['user', 'copy', 'copy.book'],
    });
  }

  async findOne(id: string): Promise<Reservation> {
    const reservation = await this.reservationsRepository.findOne({
      where: { id },
      relations: ['user', 'copy', 'copy.book'],
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    return reservation;
  }

  async fulfillReservation(id: string): Promise<Reservation> {
    const reservation = await this.findOne(id);

    if (reservation.status !== ReservationStatus.PENDING) {
      throw new BadRequestException(
        `Cannot fulfill reservation with status: ${reservation.status}`,
      );
    }

    // Verificar si no ha expirado
    if (new Date() > reservation.expirationDate) {
      throw new BadRequestException('Reservation has expired');
    }

    reservation.status = ReservationStatus.FULFILLED;
    // Actualizar el estado del ejemplar: cuando se marca la reserva como cumplida
    // también se libera el ejemplar y pasa a AVAILABLE
    // (Nota: el ejemplar pasará a BORROWED cuando se cree el préstamo)
    await this.copiesService.updateStatus(
      reservation.copyId,
      CopyStatus.AVAILABLE,
    );

    return this.reservationsRepository.save(reservation);
  }

  async cancelReservation(id: string, userId?: string): Promise<Reservation> {
    const reservation = await this.findOne(id);

    // Si se proporciona userId, verificar que sea el propietario
    if (userId && reservation.userId !== userId) {
      throw new BadRequestException('You can only cancel your own reservations');
    }

    if (reservation.status !== ReservationStatus.PENDING) {
      throw new BadRequestException(
        `Cannot cancel reservation with status: ${reservation.status}`,
      );
    }

    reservation.status = ReservationStatus.CANCELLED;

    // Liberar el ejemplar
    await this.copiesService.updateStatus(
      reservation.copyId,
      CopyStatus.AVAILABLE,
    );

    return this.reservationsRepository.save(reservation);
  }

  // Cron job para expirar reservas automáticamente (cada hora)
  @Cron(CronExpression.EVERY_HOUR)
  async expireReservations(): Promise<void> {
    const expiredReservations = await this.reservationsRepository.find({
      where: {
        status: ReservationStatus.PENDING,
        expirationDate: LessThan(new Date()),
      },
    });

    for (const reservation of expiredReservations) {
      reservation.status = ReservationStatus.EXPIRED;
      await this.reservationsRepository.save(reservation);

      // Liberar el ejemplar
      await this.copiesService.updateStatus(
        reservation.copyId,
        CopyStatus.AVAILABLE,
      );
    }

    if (expiredReservations.length > 0) {
      console.log(
        `[CRON] Expired ${expiredReservations.length} reservations`,
      );
    }
  }

  // Método manual para expirar reservas (útil para testing)
  async manualExpireReservations(): Promise<{
    message: string;
    expired: number;
  }> {
    const expiredReservations = await this.reservationsRepository.find({
      where: {
        status: ReservationStatus.PENDING,
        expirationDate: LessThan(new Date()),
      },
    });

    for (const reservation of expiredReservations) {
      reservation.status = ReservationStatus.EXPIRED;
      await this.reservationsRepository.save(reservation);

      await this.copiesService.updateStatus(
        reservation.copyId,
        CopyStatus.AVAILABLE,
      );
    }

    return {
      message: 'Expired reservations processed successfully',
      expired: expiredReservations.length,
    };
  }

  // Estadísticas de reservas
  async getReservationStats(): Promise<{
    total: number;
    pending: number;
    fulfilled: number;
    cancelled: number;
    expired: number;
  }> {
    const [total, pending, fulfilled, cancelled, expired] = await Promise.all([
      this.reservationsRepository.count(),
      this.reservationsRepository.count({
        where: { status: ReservationStatus.PENDING },
      }),
      this.reservationsRepository.count({
        where: { status: ReservationStatus.FULFILLED },
      }),
      this.reservationsRepository.count({
        where: { status: ReservationStatus.CANCELLED },
      }),
      this.reservationsRepository.count({
        where: { status: ReservationStatus.EXPIRED },
      }),
    ]);

    return {
      total,
      pending,
      fulfilled,
      cancelled,
      expired,
    };
  }

  async remove(id: string, userId?: string): Promise<void> {
    const reservation = await this.findOne(id);

    if (userId && reservation.userId !== userId) {
      throw new BadRequestException('You can only delete your own reservations');
    }
    
    await this.copiesService.updateStatus(reservation.copyId, CopyStatus.AVAILABLE);

    await this.reservationsRepository.delete(id);
  }
}
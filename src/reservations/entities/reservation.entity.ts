import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Copy } from '../../copies/entities/copy.entity';

export enum ReservationStatus {
  PENDING = 'pending',
  FULFILLED = 'fulfilled',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

@Entity('reservations')
export class Reservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.reservations, { eager: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => Copy, (copy) => copy.reservations, { eager: true })
  @JoinColumn({ name: 'copyId' })
  copy: Copy;

  @Column()
  copyId: string;

  @Column({ type: (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) ? 'datetime' : 'timestamp' })
  reservationDate: Date;

  @Column({ type: (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) ? 'datetime' : 'timestamp' })
  expirationDate: Date;

  @Column({
    type: (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) ? 'varchar' : 'enum',
    enum: ReservationStatus,
    default: ReservationStatus.PENDING,
  })
  status: ReservationStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
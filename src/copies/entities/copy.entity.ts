import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Book } from '../../books/entities/book.entity';
import { Loan } from '../../loans/entities/loan.entity';
import { Reservation } from '../../reservations/entities/reservation.entity';

export enum CopyStatus {
  AVAILABLE = 'available',
  BORROWED = 'borrowed',
  RESERVED = 'reserved',
  MAINTENANCE = 'maintenance',
  LOST = 'lost',
}

@Entity('copies')
export class Copy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column({
    type: (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) ? 'varchar' : 'enum',
    enum: CopyStatus,
    default: CopyStatus.AVAILABLE,
  })
  status: CopyStatus;

  @ManyToOne(() => Book, (book) => book.copies, { eager: true })
  @JoinColumn({ name: 'bookId' })
  book: Book;

  @Column()
  bookId: string;

  @OneToMany(() => Loan, (loan) => loan.copy)
  loans: Loan[];

  @OneToMany(() => Reservation, (reservation) => reservation.copy)
  reservations: Reservation[];
  
  @CreateDateColumn()
  createdAt: Date;
  
  @UpdateDateColumn()
  updatedAt: Date;
}
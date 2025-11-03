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

export enum LoanStatus {
  ACTIVE = 'active',
  RETURNED = 'returned',
  OVERDUE = 'overdue',
}

@Entity('loans')
export class Loan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.loans, { eager: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => Copy, (copy) => copy.loans, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'copyId' })
  copy: Copy;

  @Column()
  copyId: string;

  @Column({ type: (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) ? 'datetime' : 'timestamp' })
  loanDate: Date;

  @Column({ type: (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) ? 'datetime' : 'timestamp' })
  dueDate: Date;

  @Column({ type: (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) ? 'datetime' : 'timestamp', nullable: true })
  returnDate: Date;

  @Column({
    type: (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) ? 'varchar' : 'enum',
    enum: LoanStatus,
    default: LoanStatus.ACTIVE,
  })
  status: LoanStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  fine: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Copy } from '../../copies/entities/copy.entity';

@Entity('books')
export class Book {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  isbn: string;

  @Column()
  title: string;

  @Column()
  author: string;

  @Column({ nullable: true })
  publisher: string;

  @Column({ nullable: true })
  publishedDate: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  pageCount: number;

  @Column('simple-array', { nullable: true })
  categories: string[];

  @Column({ nullable: true })
  language: string;

  @Column({ nullable: true })
  thumbnail: string;

  @OneToMany(() => Copy, (copy) => copy.book)
  copies: Copy[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
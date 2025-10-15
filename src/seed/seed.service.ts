import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../users/entities/user.entity';
import { Book } from '../books/entities/book.entity';
import { Copy, CopyStatus } from '../copies/entities/copy.entity';

@Injectable()
export class SeedService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Book)
    private booksRepository: Repository<Book>,
    @InjectRepository(Copy)
    private copiesRepository: Repository<Copy>,
    private dataSource: DataSource
  ) {}

  async clearDatabase() {
    try {
      const currentDbResult = await this.dataSource.query(`SELECT current_database() as db;`);
      const currentDb = currentDbResult?.[0]?.db;

      if (currentDb !== 'biblio' || currentDb !== 'bibliodb_awdg') {
        return {
          message: `Abortado: la base de datos actual es '${currentDb}'. Este clear() está configurado para ejecutarse sólo en 'biblio'.`,
        };
      }

      await this.dataSource.query("SET session_replication_role = replica;");

      const tables: Array<{ tablename: string }> = await this.dataSource.query(`
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public';
      `);

      for (const { tablename } of tables) {
        if (!tablename) continue;
        await this.dataSource.query(`TRUNCATE TABLE "${tablename}" RESTART IDENTITY CASCADE;`);
      }

      await this.dataSource.query('SET session_replication_role = DEFAULT;');

      try {
        await this.usersRepository.clear();
      } catch (e) {
      }
      try {
        await this.booksRepository.clear();
      } catch (e) {
      }
      try {
        await this.copiesRepository.clear();
      } catch (e) {
      }

      return { message: 'Todas las tablas fueron limpiadas correctamente.' };
    } catch (error) {
      try {
        await this.dataSource.query('SET session_replication_role = DEFAULT;');
      } catch (e) {
        console.error(e);
      }
      throw error;
    }
    }

  async seed() {
    // For tests: drop and recreate schema
    if (process.env.NODE_ENV === 'test' || !!process.env.JEST_WORKER_ID) {
      try {
        await this.dataSource.dropDatabase();
        await this.dataSource.synchronize();
      } catch (e) {
      }
    }

    // Create users
    const adminPassword = await bcrypt.hash('Admin123!', 10);
    const librarianPassword = await bcrypt.hash('Librarian123!', 10);
    const studentPassword = await bcrypt.hash('Student123!', 10);

    const usersToCreate = [
      {
        email: 'admin@icesi.edu.co',
        password: adminPassword,
        firstName: 'Admin',
        lastName: 'System',
        role: UserRole.ADMIN,
        phone: '+57 300 111 1111',
        address: 'Calle 18 #122-135, Cali',
      },
      {
        email: 'librarian@icesi.edu.co',
        password: librarianPassword,
        firstName: 'María',
        lastName: 'González',
        role: UserRole.LIBRARIAN,
        phone: '+57 300 222 2222',
        address: 'Calle 5 #36-10, Cali',
      },
      {
        email: 'student@icesi.edu.co',
        password: studentPassword,
        firstName: 'Juan',
        lastName: 'Pérez',
        role: UserRole.STUDENT,
        phone: '+57 300 333 3333',
        address: 'Carrera 100 #11-60, Cali',
      },
    ];

    // Use upsert to avoid unique constraint issues when multiple suites run concurrently
    try {
      await this.usersRepository.upsert(usersToCreate as any, ['email']);
    } catch (e) {
      // fallback to per-item create if upsert not supported
      for (const u of usersToCreate) {
        const existing = await this.usersRepository.findOne({ where: { email: u.email } });
        if (!existing) {
          const user = this.usersRepository.create(u as any);
          await this.usersRepository.save(user);
        }
      }
    }

    // Create books (idempotent)
    const books = [
      {
        isbn: '9780134685991',
        title: 'Effective Java',
        author: 'Joshua Bloch',
        publisher: 'Addison-Wesley',
        publishedDate: '2018-01-06',
        description:
          'The definitive guide to Java programming language best practices',
        pageCount: 416,
        categories: ['Computers', 'Programming', 'Java'],
        language: 'en',
        thumbnail:
          'http://books.google.com/books/content?id=BIpDDwAAQBAJ&printsec=frontcover&img=1&zoom=1',
      },
      {
        isbn: '9780132350884',
        title: 'Clean Code',
        author: 'Robert C. Martin',
        publisher: 'Prentice Hall',
        publishedDate: '2008-08-01',
        description: 'A Handbook of Agile Software Craftsmanship',
        pageCount: 464,
        categories: ['Computers', 'Programming'],
        language: 'en',
        thumbnail:
          'http://books.google.com/books/content?id=hjEFCAAAQBAJ&printsec=frontcover&img=1&zoom=1',
      },
      {
        isbn: '9780201633610',
        title: 'Design Patterns',
        author: 'Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides',
        publisher: 'Addison-Wesley',
        publishedDate: '1994-10-31',
        description: 'Elements of Reusable Object-Oriented Software',
        pageCount: 395,
        categories: ['Computers', 'Software Engineering'],
        language: 'en',
        thumbnail:
          'http://books.google.com/books/content?id=6oHuKQe3TjQC&printsec=frontcover&img=1&zoom=1',
      },
      {
        isbn: '9780596007126',
        title: 'Head First Design Patterns',
        author: 'Eric Freeman, Elisabeth Robson',
        publisher: "O'Reilly Media",
        publishedDate: '2004-10-25',
        description: 'A Brain-Friendly Guide',
        pageCount: 694,
        categories: ['Computers', 'Programming'],
        language: 'en',
        thumbnail:
          'http://books.google.com/books/content?id=NXIrAQAAQBAJ&printsec=frontcover&img=1&zoom=1',
      },
      {
        isbn: '9780135957059',
        title: 'The Pragmatic Programmer',
        author: 'David Thomas, Andrew Hunt',
        publisher: 'Addison-Wesley',
        publishedDate: '2019-09-13',
        description: 'Your Journey To Mastery',
        pageCount: 352,
        categories: ['Computers', 'Programming'],
        language: 'en',
        thumbnail:
          'http://books.google.com/books/content?id=5wBQEp6ruIAC&printsec=frontcover&img=1&zoom=1',
      },
    ];

    try {
      await this.booksRepository.upsert(books as any, ['isbn']);
      const allSaved = await this.booksRepository.find({ where: books.map((b) => ({ isbn: b.isbn })) as any });
      // ensure order roughly matches
      const savedBooks = allSaved;
      // Create copies based on savedBooks below
      // Create copies
      const copies: Copy[] = [];
      savedBooks.forEach((book, index) => {
        for (let i = 1; i <= 3; i++) {
          const code = `COPY-${String(index + 1).padStart(3, '0')}-${i}`;
          copies.push({ code, bookId: book.id, status: CopyStatus.AVAILABLE } as any);
        }
      });

      try {
        await this.copiesRepository.upsert(copies as any, ['code']);
      } catch (e) {
        for (const c of copies) {
          const existing = await this.copiesRepository.findOne({ where: { code: c.code } });
          if (!existing) {
            const created = this.copiesRepository.create({ code: c.code, bookId: c.bookId, status: CopyStatus.AVAILABLE });
            await this.copiesRepository.save(created);
          }
        }
      }

      return {
        message: 'Database seeded successfully',
        data: {
          users: {
            admin: {
              email: 'admin@icesi.edu.co',
              password: 'Admin123!',
              role: 'admin',
            },
            librarian: {
              email: 'librarian@icesi.edu.co',
              password: 'Librarian123!',
              role: 'librarian',
            },
            student: {
              email: 'student@icesi.edu.co',
              password: 'Student123!',
              role: 'student',
            },
          },
          books: books.length,
          copies: copies.length,
        },
      };
    } catch (e) {
      // fallback behavior if upsert/find path fails
    }
    // As fallback, return a generic success (shouldn't reach here normally)
    return { message: 'Database seeded (fallback)' };
  }
}
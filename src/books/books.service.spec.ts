import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { BooksService } from './books.service';
import { Book } from './entities/book.entity';
import { Copy } from '../copies/entities/copy.entity';
import { Loan } from '../loans/entities/loan.entity';
import { Reservation } from '../reservations/entities/reservation.entity';

describe('BooksService', () => {
  let service: BooksService;
  let repository: Repository<Book>;

  const mockRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
  };

  const mockSimpleRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    delete: jest.fn(),
    remove: jest.fn(),
  };

  const mockBook: Book = {
    id: 'book-1',
    title: 'Test Book',
    author: 'Author',
    isbn: 'ISBN-123',
    description: '',
    copies: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BooksService,
        { provide: getRepositoryToken(Book), useValue: mockRepository },
        { provide: getRepositoryToken(Copy), useValue: mockSimpleRepository },
        { provide: getRepositoryToken(Loan), useValue: mockSimpleRepository },
        { provide: getRepositoryToken(Reservation), useValue: mockSimpleRepository },
      ],
    }).compile();

    service = module.get<BooksService>(BooksService);
    repository = module.get<Repository<Book>>(getRepositoryToken(Book));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('creates a book when isbn not used', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockBook);
      mockRepository.save.mockResolvedValue(mockBook);

      const dto = { title: 'Test Book', author: 'Author', isbn: 'ISBN-123' } as any;
      const res = await service.create(dto);

      expect(res).toEqual(mockBook);
      expect(mockRepository.create).toHaveBeenCalledWith(dto);
    });

    it('throws ConflictException when isbn exists', async () => {
      mockRepository.findOne.mockResolvedValue(mockBook);

      await expect(service.create({ title: '', author: '', isbn: 'ISBN-123' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    it('returns all books when no search', async () => {
      mockRepository.find.mockResolvedValue([mockBook]);
      const res = await service.findAll();
      expect(res).toEqual([mockBook]);
    });

    it('searches by title/author/isbn when search provided', async () => {
      mockRepository.find.mockResolvedValue([mockBook]);
      const res = await service.findAll('Test');
      expect(res).toEqual([mockBook]);
      expect(mockRepository.find).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('returns a book by id', async () => {
      mockRepository.findOne.mockResolvedValue(mockBook);
      const res = await service.findOne('book-1');
      expect(res).toEqual(mockBook);
    });

    it('throws NotFoundException when missing', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates a book', async () => {
      const updated = { ...mockBook, title: 'Updated' } as any;
      mockRepository.findOne.mockResolvedValueOnce(mockBook); // findOne in findOne
      mockRepository.findOne.mockResolvedValueOnce(null); // findByIsbn
      mockRepository.save.mockResolvedValue(updated);

      const res = await service.update('book-1', { title: 'Updated' } as any);
      expect(res.title).toBe('Updated');
    });
  });

});

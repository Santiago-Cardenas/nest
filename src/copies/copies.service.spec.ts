import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CopiesService } from './copies.service';
import { Copy, CopyStatus } from './entities/copy.entity';
import { BooksService } from '../books/books.service';


describe('CopiesService', () => {
  let service: CopiesService;
  let repository: Repository<Copy>;

  const mockRepository: any = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
  };

  const mockBooksService = {
    findOne: jest.fn(),
  };

  const mockSimpleRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };


  const mockCopy: Copy = {
    id: 'copy-1',
    code: 'COPY-001',
    status: CopyStatus.AVAILABLE,
    bookId: 'book-1',
    book: { id: 'book-1', title: 'Test' } as any,
    loans: [],
    reservations: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CopiesService,
        { provide: getRepositoryToken(Copy), useValue: mockRepository },
        { provide: getRepositoryToken(require('../reservations/entities/reservation.entity').Reservation), useValue: mockSimpleRepository },
        { provide: getRepositoryToken(require('../loans/entities/loan.entity').Loan), useValue: mockSimpleRepository },
        { provide: BooksService, useValue: mockBooksService },
      ],
    }).compile();

    service = module.get<CopiesService>(CopiesService);
    repository = module.get<Repository<Copy>>(getRepositoryToken(Copy));

    // Provide a fake manager.transaction on the mock repository so the service
    // can call transactions during tests.
    mockRepository.manager = {
      transaction: jest.fn(async (cb: any) => {
        const manager = { update: mockSimpleRepository.update, delete: mockSimpleRepository.delete };
        return cb(manager);
      }),
    } as any;

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('creates a copy when code not used and book exists', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      mockBooksService.findOne.mockResolvedValue({ id: 'book-1' });
      mockRepository.create.mockReturnValue(mockCopy);
      mockRepository.save.mockResolvedValue(mockCopy);

      const res = await service.create({ code: 'COPY-001', bookId: 'book-1' } as any);
      expect(res).toEqual(mockCopy);
    });

    it('throws ConflictException when code exists', async () => {
      mockRepository.findOne.mockResolvedValue(mockCopy);
      await expect(service.create({ code: 'COPY-001', bookId: 'book-1' } as any)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAvailable', () => {
    it('returns available copies', async () => {
      mockRepository.find.mockResolvedValue([mockCopy]);
      const res = await service.findAvailable();
      expect(res).toEqual([mockCopy]);
    });
  });

  describe('findOne', () => {
    it('returns a copy', async () => {
      mockRepository.findOne.mockResolvedValue(mockCopy);
      const res = await service.findOne('copy-1');
      expect(res).toEqual(mockCopy);
    });

    it('throws NotFoundException when missing', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates a copy', async () => {
      mockRepository.findOne.mockResolvedValueOnce(mockCopy); // findOne
      mockBooksService.findOne.mockResolvedValue({ id: 'book-2' });
      mockRepository.findOne.mockResolvedValueOnce(null); // check code uniqueness
      mockRepository.save.mockResolvedValue({ ...mockCopy, code: 'NEW' });

      const res = await service.update('copy-1', { code: 'NEW', bookId: 'book-2' } as any);
      expect(res.code).toBe('NEW');
    });

  });

  describe('updateStatus', () => {
    it('updates status', async () => {
      mockRepository.findOne.mockResolvedValue(mockCopy);
      mockRepository.save.mockResolvedValue({ ...mockCopy, status: CopyStatus.BORROWED });

      const res = await service.updateStatus('copy-1', CopyStatus.BORROWED);
      expect(res.status).toBe(CopyStatus.BORROWED);
    });
  });

  describe('remove', () => {
    it('removes copy', async () => {
      mockRepository.findOne.mockResolvedValue(mockCopy);
      // Ensure transaction's manager methods are mocked
      mockSimpleRepository.update.mockResolvedValue(undefined);
      mockSimpleRepository.delete.mockResolvedValue(undefined);

      await service.remove('copy-1');

      // Expect a transaction was executed and manager.update / manager.delete were called
      expect(mockRepository.manager.transaction).toHaveBeenCalled();
      expect(mockSimpleRepository.update).toHaveBeenCalled();
      expect(mockSimpleRepository.delete).toHaveBeenCalled();
    });
  });
});

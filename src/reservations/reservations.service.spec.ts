import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { Reservation, ReservationStatus } from './entities/reservation.entity';
import { CopiesService } from '../copies/copies.service';
import { CopyStatus } from '../copies/entities/copy.entity';

describe('ReservationsService', () => {
  let service: ReservationsService;
  let repository: Repository<Reservation>;
  let copiesService: CopiesService;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    delete: jest.fn(),
  };

  const mockCopiesService = {
    findOne: jest.fn(),
    updateStatus: jest.fn(),
  };

  const mockCopy = {
    id: 'copy-1',
    code: 'COPY-001',
    status: CopyStatus.AVAILABLE,
    bookId: 'book-1',
    book: {
      id: 'book-1',
      title: 'Test Book',
      author: 'Test Author',
    },
  };

  const mockReservation: Reservation = {
    id: 'reservation-1',
    userId: 'user-1',
    copyId: 'copy-1',
    reservationDate: new Date(),
    expirationDate: new Date(Date.now() + 48 * 60 * 60 * 1000),
    status: ReservationStatus.PENDING,
    user: { id: 'user-1', name: 'Test User', email: 'test@example.com' } as any,
    copy: mockCopy as any,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationsService,
        {
          provide: getRepositoryToken(Reservation),
          useValue: mockRepository,
        },
        {
          provide: CopiesService,
          useValue: mockCopiesService,
        },
      ],
    }).compile();

    service = module.get<ReservationsService>(ReservationsService);
    repository = module.get<Repository<Reservation>>(
      getRepositoryToken(Reservation),
    );
    copiesService = module.get<CopiesService>(CopiesService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createReservationDto = {
      copyId: 'copy-1',
    };

    it('should create a new reservation', async () => {
      mockCopiesService.findOne.mockResolvedValue(mockCopy);
      mockRepository.count.mockResolvedValue(0);
      mockRepository.findOne.mockResolvedValue(null);
  mockRepository.create.mockReturnValue({ ...mockReservation });
  mockRepository.save.mockResolvedValue({ ...mockReservation });
      mockCopiesService.updateStatus.mockResolvedValue(mockCopy);

      const result = await service.create('user-1', createReservationDto);

      expect(result).toEqual(mockReservation);
      expect(mockCopiesService.updateStatus).toHaveBeenCalledWith(
        'copy-1',
        CopyStatus.RESERVED,
      );
    });

    it('should throw BadRequestException if copy is not available', async () => {
      mockCopiesService.findOne.mockResolvedValue({
        ...mockCopy,
        status: CopyStatus.BORROWED,
      });

      await expect(
        service.create('user-1', createReservationDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if user reached limit', async () => {
      mockCopiesService.findOne.mockResolvedValue(mockCopy);
      mockRepository.count.mockResolvedValue(3);

      await expect(
        service.create('user-1', createReservationDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if copy already reserved', async () => {
      mockCopiesService.findOne.mockResolvedValue(mockCopy);
      mockRepository.count.mockResolvedValue(0);
  mockRepository.findOne.mockResolvedValue({ ...mockReservation });

      await expect(
        service.create('user-1', createReservationDto),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findOne', () => {
    it('should return a reservation by id', async () => {
  mockRepository.findOne.mockResolvedValue({ ...mockReservation });

      const result = await service.findOne('reservation-1');

      expect(result).toEqual(mockReservation);
    });

    it('should throw NotFoundException if reservation not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('cancelReservation', () => {
    it('should cancel a reservation', async () => {
  mockRepository.findOne.mockResolvedValue({ ...mockReservation });
      mockRepository.save.mockResolvedValue({
        ...mockReservation,
        status: ReservationStatus.CANCELLED,
      });
      mockCopiesService.updateStatus.mockResolvedValue(mockCopy);

      const result = await service.cancelReservation('reservation-1');

      expect(result.status).toBe(ReservationStatus.CANCELLED);
      expect(mockCopiesService.updateStatus).toHaveBeenCalledWith(
        'copy-1',
        CopyStatus.AVAILABLE,
      );
    });

    it('should throw BadRequestException if not user reservation', async () => {
  mockRepository.findOne.mockResolvedValue({ ...mockReservation });

      await expect(
        service.cancelReservation('reservation-1', 'other-user'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getReservationStats', () => {
    it('should return reservation statistics', async () => {
      mockRepository.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(3) // pending
        .mockResolvedValueOnce(5) // fulfilled
        .mockResolvedValueOnce(1) // cancelled
        .mockResolvedValueOnce(1); // expired

      const result = await service.getReservationStats();

      expect(result).toEqual({
        total: 10,
        pending: 3,
        fulfilled: 5,
        cancelled: 1,
        expired: 1,
      });
    });
  });

  describe('remove', () => {
    it('should delete reservation for owner and release copy', async () => {
      mockRepository.findOne.mockResolvedValue({ ...mockReservation });
      mockRepository.delete = jest.fn().mockResolvedValue(undefined);
      mockCopiesService.updateStatus.mockResolvedValue(mockCopy);

      await service.remove('reservation-1', 'user-1');

      expect(mockCopiesService.updateStatus).toHaveBeenCalledWith(
        'copy-1',
        CopyStatus.AVAILABLE,
      );
      expect(mockRepository.delete).toHaveBeenCalledWith('reservation-1');
    });

    it('should throw if user is not owner', async () => {
      mockRepository.findOne.mockResolvedValue({ ...mockReservation });

      await expect(
        service.remove('reservation-1', 'other-user'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should delete reservation even if not pending', async () => {
      mockRepository.findOne.mockResolvedValue({ ...mockReservation, status: ReservationStatus.CANCELLED });
      mockRepository.delete = jest.fn().mockResolvedValue(undefined);
      mockCopiesService.updateStatus.mockResolvedValue(mockCopy);

      await service.remove('reservation-1', 'user-1');

      expect(mockCopiesService.updateStatus).toHaveBeenCalledWith('copy-1', CopyStatus.AVAILABLE);
      expect(mockRepository.delete).toHaveBeenCalledWith('reservation-1');
    });

    it('should allow admin to delete (no userId)', async () => {
      mockRepository.findOne.mockResolvedValue({ ...mockReservation });
      mockRepository.delete = jest.fn().mockResolvedValue(undefined);
      mockCopiesService.updateStatus.mockResolvedValue(mockCopy);

      await service.remove('reservation-1');

      expect(mockCopiesService.updateStatus).toHaveBeenCalledWith('copy-1', CopyStatus.AVAILABLE);
      expect(mockRepository.delete).toHaveBeenCalledWith('reservation-1');
    });
  });
});
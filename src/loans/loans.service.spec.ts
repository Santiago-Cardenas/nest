import { BadRequestException } from '@nestjs/common';
import { LoansService } from './loans.service';
import { CopyStatus } from '../copies/entities/copy.entity';
import { LoanStatus } from './entities/loan.entity';

describe('LoansService', () => {
  let service: LoansService;
  let mockLoansRepo: any;
  let mockCopiesService: any;
  let mockReservationsService: any;

  beforeEach(() => {
    mockLoansRepo = {
      count: jest.fn(),
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn((loan) => Promise.resolve({ ...loan, id: 'loan-id' })),
      findOne: jest.fn(),
    };

    mockCopiesService = {
      findOne: jest.fn(),
      updateStatus: jest.fn(() => Promise.resolve()),
    };

    mockReservationsService = {
      findPendingReservationByCopy: jest.fn(),
      fulfillReservation: jest.fn(() => Promise.resolve()),
    };

    service = new LoansService(mockLoansRepo, mockCopiesService, mockReservationsService);
  });

  it('should create a loan when copy is available and no reservation exists', async () => {
    mockCopiesService.findOne.mockResolvedValue({ id: 'copy-1', status: CopyStatus.AVAILABLE });
    mockReservationsService.findPendingReservationByCopy.mockResolvedValue(null);
    mockLoansRepo.count.mockResolvedValue(0);

    const result = await service.create('user-1', { copyId: 'copy-1', notes: 'test' });

    expect(mockCopiesService.findOne).toHaveBeenCalledWith('copy-1');
    expect(mockLoansRepo.count).toHaveBeenCalledWith({ where: { userId: 'user-1', status: LoanStatus.ACTIVE } });
    expect(mockCopiesService.updateStatus).toHaveBeenCalledWith('copy-1', expect.any(String));
    expect(result).toHaveProperty('id', 'loan-id');
    expect(result.status).toBe(LoanStatus.ACTIVE);
  });

  it('should throw if copy is reserved by another user', async () => {
    mockReservationsService.findPendingReservationByCopy.mockResolvedValue({ id: 'res-1', userId: 'other-user', status: 'pending' });

    await expect(service.create('user-1', { copyId: 'copy-1' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should throw if user reached max active loans', async () => {
    mockCopiesService.findOne.mockResolvedValue({ id: 'copy-1', status: CopyStatus.AVAILABLE });
    mockReservationsService.findPendingReservationByCopy.mockResolvedValue(null);
    mockLoansRepo.count.mockResolvedValue(3);

    await expect(service.create('user-1', { copyId: 'copy-1' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returnLoan should set status returned and not fine when on time', async () => {
    const loan = {
      id: 'loan-1',
      userId: 'user-1',
      copyId: 'copy-1',
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24),
      status: LoanStatus.ACTIVE,
    } as any;

    mockLoansRepo.findOne.mockResolvedValue(loan);
    mockLoansRepo.save.mockImplementation(async (l: any) => l);

    const res = await service.returnLoan('loan-1');

    expect(res.status).toBe(LoanStatus.RETURNED);
    expect(res.fine || 0).toBe(0);
    expect(mockCopiesService.updateStatus).toHaveBeenCalledWith('copy-1', expect.any(String));
  });

  it('returnLoan should calculate fine when overdue', async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 10);

    const loan = {
      id: 'loan-2',
      userId: 'user-1',
      copyId: 'copy-2',
      dueDate: pastDate,
      status: LoanStatus.ACTIVE,
    } as any;

    mockLoansRepo.findOne.mockResolvedValue(loan);
    mockLoansRepo.save.mockImplementation(async (l: any) => l);

    const res = await service.returnLoan('loan-2');

    expect(res.status).toBe(LoanStatus.RETURNED);
    expect(res.fine).toBeGreaterThan(0);
    expect(mockCopiesService.updateStatus).toHaveBeenCalledWith('copy-2', expect.any(String));
  });

  it('getLoanStats should call counts and return stats', async () => {
    mockLoansRepo.count.mockResolvedValueOnce(10);
    mockLoansRepo.count.mockResolvedValueOnce(4);
    mockLoansRepo.count.mockResolvedValueOnce(2);
    mockLoansRepo.count.mockResolvedValueOnce(4);

    const stats = await service.getLoanStats();

    expect(stats).toHaveProperty('total', 10);
    expect(stats).toHaveProperty('active', 4);
    expect(stats).toHaveProperty('overdue', 2);
    expect(stats).toHaveProperty('returned', 4);
  });

  it('remove should delete active loan and free copy', async () => {
    mockLoansRepo.findOne.mockResolvedValue({ id: 'loan-10', status: LoanStatus.ACTIVE, copyId: 'copy-10' });
    mockLoansRepo.delete = jest.fn().mockResolvedValue({});

    await expect(service.remove('loan-10')).resolves.toBeUndefined();
    expect(mockCopiesService.updateStatus).toHaveBeenCalledWith('copy-10', expect.any(String));
    expect(mockLoansRepo.delete).toHaveBeenCalledWith('loan-10');
  });

  it('remove should delete returned loan without freeing copy', async () => {
    mockLoansRepo.findOne.mockResolvedValue({ id: 'loan-11', status: LoanStatus.RETURNED, copyId: 'copy-11' });
    mockLoansRepo.delete = jest.fn().mockResolvedValue({});

    await expect(service.remove('loan-11')).resolves.toBeUndefined();
    expect(mockCopiesService.updateStatus).not.toHaveBeenCalledWith('copy-11', expect.any(String));
    expect(mockLoansRepo.delete).toHaveBeenCalledWith('loan-11');
  });
});

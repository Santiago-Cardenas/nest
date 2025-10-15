import { Test, TestingModule } from '@nestjs/testing';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { ReservationStatus } from './entities/reservation.entity';

describe('ReservationsController', () => {
  let controller: ReservationsController;
  const mockService = {
    create: jest.fn(),
    findUserReservations: jest.fn(),
    cancelReservation: jest.fn(),
    manualExpireReservations: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReservationsController],
      providers: [{ provide: ReservationsService, useValue: mockService }],
    }).compile();

    controller = module.get<ReservationsController>(ReservationsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('calls service.create with user id from request', async () => {
      mockService.create.mockResolvedValue({ id: 'r1' });
      const req = { user: { id: 'user-1' } } as any;
      const dto = { copyId: 'copy-1' };
      const res = await controller.create(req, dto as any);
      expect(mockService.create).toHaveBeenCalledWith('user-1', dto);
      expect(res).toEqual({ id: 'r1' });
    });
  });

  describe('findMyReservations', () => {
    it('returns reservations for user', async () => {
      mockService.findUserReservations.mockResolvedValue([{ id: 'r1' }]);
      const req = { user: { id: 'user-1' } } as any;
      const res = await controller.findMyReservations(req);
      expect(mockService.findUserReservations).toHaveBeenCalledWith('user-1');
      expect(res).toEqual([{ id: 'r1' }]);
    });
  });

  describe('cancelReservation', () => {
    it('calls cancelReservation for regular user passing user id', async () => {
      mockService.cancelReservation.mockResolvedValue({ id: 'r1', status: ReservationStatus.CANCELLED });
      const req = { user: { id: 'user-1', role: 'STUDENT' } } as any;
      const res = await controller.cancelReservation('r1', req, undefined as any);
      expect(mockService.cancelReservation).toHaveBeenCalledWith('r1', 'user-1');
      expect(res.status).toBe(ReservationStatus.CANCELLED);
    });

    it('calls cancelReservation for admin without user filter', async () => {
      mockService.cancelReservation.mockResolvedValue({ id: 'r2', status: ReservationStatus.CANCELLED });
      const req = { user: { id: 'admin-1', role: 'admin' } } as any; // match enum lowercase value
      const res = await controller.cancelReservation('r2', req, undefined as any);
      expect(mockService.cancelReservation).toHaveBeenCalledWith('r2', undefined);
      expect(res.status).toBe(ReservationStatus.CANCELLED);
    });
  });

  describe('expireReservations', () => {
    it('calls manualExpireReservations', async () => {
      mockService.manualExpireReservations.mockResolvedValue({ message: 'ok', expired: 2 });
      const res = await controller.expireReservations();
      expect(mockService.manualExpireReservations).toHaveBeenCalled();
      expect(res).toEqual({ message: 'ok', expired: 2 });
    });
  });

  describe('deleteReservation', () => {
    it('calls remove with user id for regular user', async () => {
      mockService.remove.mockResolvedValue(undefined);
      const req = { user: { id: 'user-1', role: 'student' } } as any;
      await controller.deleteReservation('r1', req);
      expect(mockService.remove).toHaveBeenCalledWith('r1', 'user-1');
    });

    it('calls remove without user id for admin', async () => {
      mockService.remove.mockResolvedValue(undefined);
      const req = { user: { id: 'admin-1', role: 'admin' } } as any;
      await controller.deleteReservation('r2', req);
      expect(mockService.remove).toHaveBeenCalledWith('r2', undefined);
    });
  });
});

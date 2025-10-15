import { Test, TestingModule } from '@nestjs/testing';
import { LoansController } from './loans.controller';
import { LoansService } from './loans.service';

describe('LoansController', () => {
  let controller: LoansController;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findUserLoans: jest.fn(),
    findOne: jest.fn(),
    returnLoan: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LoansController],
      providers: [{ provide: LoansService, useValue: mockService }],
    }).compile();

    controller = module.get<LoansController>(LoansController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('calls service.create with user id and dto', async () => {
      const req: any = { user: { id: 'user1' } };
      const dto = { copyId: 'c1' } as any;
      mockService.create.mockResolvedValue({ id: 'loan1', copyId: 'c1' });
      const res = await controller.create(req, dto);
      expect(mockService.create).toHaveBeenCalledWith('user1', dto);
      expect(res).toEqual({ id: 'loan1', copyId: 'c1' });
    });
  });

  describe('findAll', () => {
    it('calls service.findAll', async () => {
      mockService.findAll.mockResolvedValue([{ id: 'l1' }]);
      const res = await controller.findAll();
      expect(mockService.findAll).toHaveBeenCalled();
      expect(res).toEqual([{ id: 'l1' }]);
    });
  });

  describe('findMyLoans', () => {
    it('calls service.findUserLoans with req.user.id', async () => {
      const req: any = { user: { id: 'user1' } };
      mockService.findUserLoans.mockResolvedValue([{ id: 'l2' }]);
      const res = await controller.findMyLoans(req);
      expect(mockService.findUserLoans).toHaveBeenCalledWith('user1');
      expect(res).toEqual([{ id: 'l2' }]);
    });
  });

  describe('returnLoan', () => {
    it('calls service.returnLoan with id', async () => {
      mockService.returnLoan.mockResolvedValue({ id: 'loan1', status: 'returned' });
      const res = await controller.returnLoan('loan1');
      expect(mockService.returnLoan).toHaveBeenCalledWith('loan1');
      expect(res).toEqual({ id: 'loan1', status: 'returned' });
    });
  });

  describe('remove', () => {
    it('calls service.remove with id', async () => {
      mockService.remove.mockResolvedValue(undefined);
      await controller.remove('loan1');
      expect(mockService.remove).toHaveBeenCalledWith('loan1');
    });
  });
});

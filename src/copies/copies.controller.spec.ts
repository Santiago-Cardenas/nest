import { Test, TestingModule } from '@nestjs/testing';
import { CopiesController } from './copies.controller';
import { CopiesService } from './copies.service';
import { CopyStatus } from './entities/copy.entity';

describe('CopiesController', () => {
  let controller: CopiesController;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findAvailable: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CopiesController],
      providers: [{ provide: CopiesService, useValue: mockService }],
    }).compile();

    controller = module.get<CopiesController>(CopiesController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAvailable', () => {
    it('returns available copies', async () => {
      mockService.findAvailable.mockResolvedValue([{ id: 'c1' }]);
      const res = await controller.findAvailable();
      expect(mockService.findAvailable).toHaveBeenCalled();
      expect(res).toEqual([{ id: 'c1' }]);
    });
  });

  describe('checkAvailability', () => {
    it('returns availability shape', async () => {
      const copy = {
        id: 'c1',
        code: 'CODE',
        status: CopyStatus.AVAILABLE,
        book: { id: 'b1', title: 'Book', author: 'A', isbn: 'I' },
      } as any;

      mockService.findOne.mockResolvedValue(copy);
      const res = await controller.checkAvailability('c1');
      expect(mockService.findOne).toHaveBeenCalledWith('c1');
      expect(res.copyId).toBe('c1');
      expect(res.isAvailable).toBe(true);
      expect(res.book.title).toBe('Book');
    });
  });
});

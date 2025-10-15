import { Test, TestingModule } from '@nestjs/testing';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';
import { UserRole } from '../users/entities/user.entity';

describe('BooksController', () => {
  let controller: BooksController;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BooksController],
      providers: [{ provide: BooksService, useValue: mockService }],
    }).compile();

    controller = module.get<BooksController>(BooksController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('calls service.create', async () => {
      const dto = { title: 'T', author: 'A', isbn: 'I' } as any;
      mockService.create.mockResolvedValue({ id: '1', ...dto });
      const res = await controller.create(dto);
      expect(mockService.create).toHaveBeenCalledWith(dto);
      expect(res).toEqual({ id: '1', ...dto });
    });
  });

  describe('findAll', () => {
    it('calls service.findAll without search', async () => {
      mockService.findAll.mockResolvedValue([{ id: '1' }]);
      const res = await controller.findAll(undefined);
      expect(mockService.findAll).toHaveBeenCalledWith(undefined);
      expect(res).toEqual([{ id: '1' }]);
    });

    it('calls service.findAll with search', async () => {
      mockService.findAll.mockResolvedValue([{ id: '2' }]);
      const res = await controller.findAll('query');
      expect(mockService.findAll).toHaveBeenCalledWith('query');
      expect(res).toEqual([{ id: '2' }]);
    });
  });

  describe('findOne', () => {
    it('calls service.findOne with id', async () => {
      mockService.findOne.mockResolvedValue({ id: '1' });
      const res = await controller.findOne('1');
      expect(mockService.findOne).toHaveBeenCalledWith('1');
      expect(res).toEqual({ id: '1' });
    });
  });

  describe('update', () => {
    it('calls service.update with id and dto', async () => {
      mockService.update.mockResolvedValue({ id: '1', title: 'Updated' });
      const res = await controller.update('1', { title: 'Updated' } as any);
      expect(mockService.update).toHaveBeenCalledWith('1', { title: 'Updated' });
      expect(res).toEqual({ id: '1', title: 'Updated' });
    });
  });

  describe('remove', () => {
    it('calls service.remove with id', async () => {
      mockService.remove.mockResolvedValue(undefined);
      const res = await controller.remove('1');
      expect(mockService.remove).toHaveBeenCalledWith('1');
      expect(res).toBeUndefined();
    });
  });
});

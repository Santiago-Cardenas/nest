import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './user.controller';
import { UsersService } from './user.service';

describe('UsersController', () => {
  let controller: UsersController;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('calls service.create', async () => {
      const dto = { email: 'a@b.com', password: 'P@ssword' } as any;
      mockService.create.mockResolvedValue({ id: 'u1', email: 'a@b.com' });
      const res = await controller.create(dto);
      expect(mockService.create).toHaveBeenCalledWith(dto);
      expect(res).toEqual({ id: 'u1', email: 'a@b.com' });
    });
  });

  describe('findAll', () => {
    it('calls service.findAll', async () => {
      mockService.findAll.mockResolvedValue([{ id: 'u1' }]);
      const res = await controller.findAll();
      expect(mockService.findAll).toHaveBeenCalled();
      expect(res).toEqual([{ id: 'u1' }]);
    });
  });

  describe('getProfile', () => {
    it('calls service.findOne with req.user.id', async () => {
      const req: any = { user: { id: 'u1' } };
      mockService.findOne.mockResolvedValue({ id: 'u1' });
      const res = await controller.getProfile(req);
      expect(mockService.findOne).toHaveBeenCalledWith('u1');
      expect(res).toEqual({ id: 'u1' });
    });
  });

  describe('updateProfile', () => {
    it('calls service.update with req.user.id', async () => {
      const req: any = { user: { id: 'u1' } };
      const dto = { firstName: 'New' } as any;
      mockService.update.mockResolvedValue({ id: 'u1', firstName: 'New' });
      const res = await controller.updateProfile(req, dto);
      expect(mockService.update).toHaveBeenCalledWith('u1', dto);
      expect(res).toEqual({ id: 'u1', firstName: 'New' });
    });
  });

  describe('remove', () => {
    it('calls service.remove with id', async () => {
      mockService.remove.mockResolvedValue(undefined);
      const res = await controller.remove('u1');
      expect(mockService.remove).toHaveBeenCalledWith('u1');
      expect(res).toBeUndefined();
    });
  });
});

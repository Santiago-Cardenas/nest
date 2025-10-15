import { Test, TestingModule } from '@nestjs/testing';
import { GoogleBooksController } from './google-books.controller';
import { GoogleBooksService } from './google-books.service';

describe('GoogleBooksController', () => {
  let controller: GoogleBooksController;

  const mockService = {
    search: jest.fn(),
    searchByIsbn: jest.fn(),
    getVolumeById: jest.fn(),
    enrichBookData: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GoogleBooksController],
      providers: [{ provide: GoogleBooksService, useValue: mockService }],
    }).compile();

    controller = module.get<GoogleBooksController>(GoogleBooksController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('search', () => {
    it('calls service.search with query', async () => {
      mockService.search.mockResolvedValue({ items: [] });
      const res = await controller.search('clean code');
      expect(mockService.search).toHaveBeenCalledWith('clean code');
      expect(res).toEqual({ items: [] });
    });
  });

  describe('searchByIsbn', () => {
    it('calls service.searchByIsbn', async () => {
      mockService.searchByIsbn.mockResolvedValue({ items: [] });
      const res = await controller.searchByIsbn('9780132350884');
      expect(mockService.searchByIsbn).toHaveBeenCalledWith('9780132350884');
      expect(res).toEqual({ items: [] });
    });
  });

  describe('getVolumeById', () => {
    it('calls service.getVolumeById', async () => {
      mockService.getVolumeById.mockResolvedValue({ id: 'vol1' });
      const res = await controller.getVolumeById('vol1');
      expect(mockService.getVolumeById).toHaveBeenCalledWith('vol1');
      expect(res).toEqual({ id: 'vol1' });
    });
  });

  describe('enrichBookData', () => {
    it('calls service.enrichBookData', async () => {
      mockService.enrichBookData.mockResolvedValue({ id: 'book1' });
      const res = await controller.enrichBookData('9780132350884');
      expect(mockService.enrichBookData).toHaveBeenCalledWith('9780132350884');
      expect(res).toEqual({ id: 'book1' });
    });
  });
});

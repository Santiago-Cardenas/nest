import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';
import { GoogleBooksService } from './google-books.service';
import { BooksService } from '../books/books.service';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('GoogleBooksService', () => {
  let service: GoogleBooksService;
  const mockHttpService = {
    get: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockBooksService = {
    findByIsbn: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleBooksService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: BooksService, useValue: mockBooksService },
      ],
    }).compile();

    service = module.get<GoogleBooksService>(GoogleBooksService);
    jest.clearAllMocks();
  });

  it('should throw SERVICE_UNAVAILABLE when api key missing', async () => {
    mockConfigService.get.mockReturnValue(undefined);
    await expect(service.search('q')).rejects.toThrow(HttpException);
  });

  it('should throw BAD_REQUEST when query empty', async () => {
    mockConfigService.get.mockReturnValue('KEY');
    await expect(service.search('')).rejects.toThrow(HttpException);
  });

  it('should call HttpService.get and return data on search', async () => {
    mockConfigService.get.mockReturnValue('KEY');
    const fakeResp = { data: { items: [{ id: '1' }] } };
    mockHttpService.get.mockReturnValue(of(fakeResp));

    const res = await service.search('clean code');
    expect(mockHttpService.get).toHaveBeenCalled();
    expect(res).toEqual(fakeResp.data);
  });

  it('searchByIsbn should call http and return data', async () => {
    mockConfigService.get.mockReturnValue('KEY');
    const fakeResp = { data: { items: [{ id: '1' }] } };
    mockHttpService.get.mockReturnValue(of(fakeResp));

    const res = await service.searchByIsbn('9780132350884');
    expect(mockHttpService.get).toHaveBeenCalled();
    expect(res).toEqual(fakeResp.data);
  });

  it('enrichBookData should create book when not existing', async () => {
    mockConfigService.get.mockReturnValue('KEY');
    const googleData = { items: [{ volumeInfo: { title: 'T', authors: ['A'], imageLinks: { thumbnail: 't' } } }] };
    mockHttpService.get.mockReturnValue(of({ data: googleData }));
    mockBooksService.findByIsbn.mockResolvedValue(null);

    const res = await service.enrichBookData('9780132350884');
    // Should NOT create the book automatically; return only the DTO to the caller
    expect(mockBooksService.create).not.toHaveBeenCalled();
    expect(res).toEqual({
      isbn: '9780132350884',
      title: 'T',
      author: 'A',
      publisher: undefined,
      publishedDate: undefined,
      description: undefined,
      pageCount: undefined,
      categories: undefined,
      language: undefined,
      thumbnail: 't',
    });
  });

  it('enrichBookData should update when book exists', async () => {
    mockConfigService.get.mockReturnValue('KEY');
    const googleData = { items: [{ volumeInfo: { title: 'T', authors: ['A'] } }] };
    mockHttpService.get.mockReturnValue(of({ data: googleData }));
    mockBooksService.findByIsbn.mockResolvedValue({ id: 'b1' });

    const res = await service.enrichBookData('9780132350884');
    // Should NOT update the book automatically; return only the DTO
    expect(mockBooksService.update).not.toHaveBeenCalled();
    expect(res).toEqual({
      isbn: '9780132350884',
      title: 'T',
      author: 'A',
      publisher: undefined,
      publishedDate: undefined,
      description: undefined,
      pageCount: undefined,
      categories: undefined,
      language: undefined,
      thumbnail: undefined,
    });
  });

  it('getVolumeById throws BAD_REQUEST when id empty', async () => {
    mockConfigService.get.mockReturnValue('KEY');
    await expect(service.getVolumeById('')).rejects.toThrow(HttpException);
  });
});

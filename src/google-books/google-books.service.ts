import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { BooksService } from '../books/books.service';
import { CreateBookDto } from '../books/dto/create-book.dto';

@Injectable()
export class GoogleBooksService {
  private readonly apiKey?: string;
  private readonly baseUrl = 'https://www.googleapis.com/books/v1/volumes';

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    private booksService: BooksService,
  ) {
    const apiKey = this.configService.get<string>('GOOGLE_BOOKS_API_KEY');
    this.apiKey = apiKey;
  }

  private ensureApiKey(): void {
    if (!this.apiKey) {
      throw new HttpException(
        'Google Books API key not configured. Set GOOGLE_BOOKS_API_KEY in environment.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  async search(query: string) {
    if (!query || query.trim().length === 0) {
      throw new HttpException('Query parameter q is required', HttpStatus.BAD_REQUEST);
    }
    try {
      this.ensureApiKey();
      const response = await firstValueFrom(
        this.httpService.get(this.baseUrl, {
          params: {
            q: query,
            key: this.apiKey,
            maxResults: 20,
          },
        }),
      );

      return response.data;
    } catch (error) {
      // If the service already threw a proper HttpException (e.g. 503 when API key missing), rethrow it
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Error fetching books from Google Books API',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async searchByIsbn(isbn: string) {
    if (!isbn || isbn.trim().length === 0) {
      throw new HttpException('ISBN is required', HttpStatus.BAD_REQUEST);
    }
    try {
      this.ensureApiKey();
      const response = await firstValueFrom(
        this.httpService.get(this.baseUrl, {
          params: {
            q: `isbn:${isbn}`,
            key: this.apiKey,
          },
        }),
      );

      return response.data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Error fetching book from Google Books API',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async enrichBookData(isbn: string): Promise<any> {
    const googleData = await this.searchByIsbn(isbn);

    if (!googleData?.items || googleData.items.length === 0) {
      throw new HttpException('Book not found in Google Books', HttpStatus.NOT_FOUND);
    }

    const bookInfo = googleData.items[0].volumeInfo || {};

    const createBookDto: CreateBookDto = {
      isbn,
      title: bookInfo.title || 'Unknown',
      author: Array.isArray(bookInfo.authors) ? bookInfo.authors.join(', ') : (bookInfo.authors || 'Unknown'),
      publisher: bookInfo.publisher,
      publishedDate: bookInfo.publishedDate,
      description: bookInfo.description,
      pageCount: bookInfo.pageCount,
      categories: bookInfo.categories,
      language: bookInfo.language,
      thumbnail: bookInfo.imageLinks?.thumbnail,
    };

    // Do NOT create or update the book here — only return the data to the caller.
    // The frontend will call the create endpoint when the user confirms.
    return createBookDto;
  }

  async getVolumeById(volumeId: string) {
    if (!volumeId || volumeId.trim().length === 0) {
      throw new HttpException('Volume id is required', HttpStatus.BAD_REQUEST);
    }

    this.ensureApiKey();

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/${encodeURIComponent(volumeId)}`, {
          params: {
            key: this.apiKey,
          },
        }),
      );

      return response.data;
    } catch (error) {
        if (error instanceof HttpException) {
          throw error;
        }

        throw new HttpException(
          'Error fetching volume from Google Books API',
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
    }
  }
}
import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { GoogleBooksService } from './google-books.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('google-books')
@ApiBearerAuth('JWT-auth')
@Controller('google-books')
export class GoogleBooksController {
  constructor(private readonly googleBooksService: GoogleBooksService) {}

  @Get('search')
  @Public()
  @ApiOperation({ summary: 'Search books in Google Books API' })
  @ApiQuery({ name: 'q', example: 'Clean Code' })
  @ApiResponse({ status: 200, description: 'Books found' })
  search(@Query('q') query: string) {
    return this.googleBooksService.search(query);
  }

  @Get('isbn/:isbn')
  @Public()
  @ApiOperation({ summary: 'Search book by ISBN in Google Books API' })
  @ApiResponse({ status: 200, description: 'Book found' })
  searchByIsbn(@Param('isbn') isbn: string) {
    return this.googleBooksService.searchByIsbn(isbn);
  }

  @Get('volume/:id')
  @Public()
  @ApiOperation({ summary: 'Get a volume by Google Books volume id' })
  @ApiResponse({ status: 200, description: 'Volume found' })
  getVolumeById(@Param('id') id: string) {
    return this.googleBooksService.getVolumeById(id);
  }

  @Post('enrich/:isbn')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.LIBRARIAN)
  @ApiOperation({ summary: 'Enrich book data from Google Books API' })
  @ApiResponse({
    status: 201,
    description: 'Book data enriched successfully',
  })
  enrichBookData(@Param('isbn') isbn: string) {
    return this.googleBooksService.enrichBookData(isbn);
  }
}
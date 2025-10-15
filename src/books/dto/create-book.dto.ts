import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  Matches,
} from 'class-validator';

export class CreateBookDto {
  @ApiProperty({ example: '978-0-13-468599-1' })
  @IsString()
  @Matches(/^(?:\d{10}|\d{13})$/, {
    message: 'ISBN must be 10 or 13 digits',
  })
  isbn: string;

  @ApiProperty({ example: 'Clean Code' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Robert C. Martin' })
  @IsString()
  author: string;

  @ApiProperty({ example: 'Prentice Hall', required: false })
  @IsString()
  @IsOptional()
  publisher?: string;

  @ApiProperty({ example: '2008-08-01', required: false })
  @IsString()
  @IsOptional()
  publishedDate?: string;

  @ApiProperty({
    example: 'A handbook of agile software craftsmanship',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 464, required: false })
  @IsNumber()
  @IsOptional()
  pageCount?: number;

  @ApiProperty({ example: ['Computers', 'Programming'], required: false })
  @IsArray()
  @IsOptional()
  categories?: string[];

  @ApiProperty({ example: 'en', required: false })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiProperty({
    example: 'http://books.google.com/books/content?id=...',
    required: false,
  })
  @IsString()
  @IsOptional()
  thumbnail?: string;
}
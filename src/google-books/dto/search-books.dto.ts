import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class SearchBooksDto {
  @ApiProperty({ example: 'Clean Code' })
  @IsString()
  q: string;
}
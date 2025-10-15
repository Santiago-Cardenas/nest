import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsUUID } from 'class-validator';
import { CopyStatus } from '../entities/copy.entity';

export class CreateCopyDto {
  @ApiProperty({ example: 'COPY-001-2024' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'uuid-of-book' })
  @IsUUID()
  bookId: string;

  @ApiProperty({ enum: CopyStatus, example: CopyStatus.AVAILABLE })
  @IsEnum(CopyStatus)
  status: CopyStatus;
}
import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsString } from 'class-validator';

export class CreateLoanDto {
  @ApiProperty({ example: 'uuid-of-copy' })
  @IsUUID()
  copyId: string;

  @ApiProperty({ example: 'User requested expedited loan', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
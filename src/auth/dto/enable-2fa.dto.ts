import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class Enable2FADto {
  @ApiProperty({ example: '123456' })
  @IsString()
  token: string;
}
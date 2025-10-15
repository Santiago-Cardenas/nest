import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class Verify2FADto {
  @ApiProperty({ example: 'user@icesi.edu.co' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  password: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  token: string;
}
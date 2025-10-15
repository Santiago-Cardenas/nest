import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsDateString } from 'class-validator';

export class CreateReservationDto {
  @ApiProperty({
    description: 'ID del ejemplar a reservar',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: String,
    format: 'uuid',
  })
  @IsUUID('4', { message: 'copyId must be a valid UUID' })
  copyId: string;

  @ApiPropertyOptional({
    description:
      'Fecha de expiración personalizada (opcional). Por defecto: 48 horas desde ahora',
    example: '2025-10-17T14:00:00Z',
    type: String,
    format: 'date-time',
  })
  @IsDateString({}, { message: 'expirationDate must be a valid ISO 8601 date string' })
  @IsOptional()
  expirationDate?: string;
}
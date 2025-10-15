import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CancelReservationDto {
  @ApiPropertyOptional({
    description: 'Razón de cancelación (opcional)',
    example: 'Usuario cambió de opinión',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Param,
  UseGuards,
  Request,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { CancelReservationDto } from './dto/cancel-reservation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('reservations')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new reservation',
    description: `
      Crea una nueva reserva para un ejemplar disponible.
      
      **Reglas de negocio:**
      - El ejemplar debe estar disponible (status: AVAILABLE)
      - El usuario puede tener máximo 3 reservas activas
      - La reserva expira en 48 horas por defecto
      - Solo puede haber una reserva activa por ejemplar
      
      **Proceso:**
      1. El sistema verifica que el ejemplar esté disponible
      2. Valida que el usuario no tenga 3 reservas activas
      3. Confirma que no haya otra reserva pendiente para ese ejemplar
      4. Crea la reserva con estado PENDING
      5. Cambia el estado del ejemplar a RESERVED
    `,
  })
  @ApiResponse({
    status: 201,
    description: 'Reservation created successfully',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        copyId: '123e4567-e89b-12d3-a456-426614174002',
        reservationDate: '2025-10-15T10:00:00.000Z',
        expirationDate: '2025-10-17T10:00:00.000Z',
        status: 'pending',
        createdAt: '2025-10-15T10:00:00.000Z',
        updatedAt: '2025-10-15T10:00:00.000Z',
        copy: {
          id: '123e4567-e89b-12d3-a456-426614174002',
          code: 'COPY-001-1',
          status: 'reserved',
          book: {
            title: 'Clean Code',
            author: 'Robert C. Martin',
            isbn: '9780132350884',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Copy not available or user reached limit',
    schema: {
      example: {
        statusCode: 400,
        message: 'User has reached maximum active reservations (3)',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Copy already has an active reservation',
    schema: {
      example: {
        statusCode: 409,
        message: 'This copy already has an active reservation',
        error: 'Conflict',
      },
    },
  })
  create(@Request() req, @Body() createReservationDto: CreateReservationDto) {
    return this.reservationsService.create(req.user.id, createReservationDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.LIBRARIAN)
  @ApiOperation({
    summary: 'Get all reservations (Admin/Librarian only)',
    description:
      'Retorna todas las reservas del sistema con información de usuario, ejemplar y libro',
  })
  @ApiResponse({
    status: 200,
    description: 'List of all reservations',
    schema: {
      example: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          userId: '123e4567-e89b-12d3-a456-426614174001',
          copyId: '123e4567-e89b-12d3-a456-426614174002',
          reservationDate: '2025-10-15T10:00:00.000Z',
          expirationDate: '2025-10-17T10:00:00.000Z',
          status: 'pending',
          user: {
            email: 'student@icesi.edu.co',
            firstName: 'Juan',
            lastName: 'Pérez',
          },
          copy: {
            code: 'COPY-001-1',
            book: {
              title: 'Clean Code',
              author: 'Robert C. Martin',
            },
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User does not have required role',
  })
  findAll() {
    return this.reservationsService.findAll();
  }

  @Get('my')
  @ApiOperation({
    summary: 'Get current user reservations',
    description:
      'Retorna todas las reservas del usuario autenticado, ordenadas por fecha de creación',
  })
  @ApiResponse({
    status: 200,
    description: 'List of user reservations',
  })
  findMyReservations(@Request() req) {
    return this.reservationsService.findUserReservations(req.user.id);
  }

  @Get('pending')
  @Roles(UserRole.ADMIN, UserRole.LIBRARIAN)
  @ApiOperation({
    summary: 'Get all pending reservations (Admin/Librarian only)',
    description:
      'Retorna solo las reservas con estado PENDING, ordenadas por fecha de reserva',
  })
  @ApiResponse({
    status: 200,
    description: 'List of pending reservations',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User does not have required role',
  })
  findPending() {
    return this.reservationsService.findPendingReservations();
  }

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.LIBRARIAN)
  @ApiOperation({
    summary: 'Get reservation statistics (Admin/Librarian only)',
    description: 'Retorna estadísticas generales sobre las reservas del sistema',
  })
  @ApiResponse({
    status: 200,
    description: 'Reservation statistics',
    schema: {
      example: {
        total: 50,
        pending: 10,
        fulfilled: 30,
        cancelled: 5,
        expired: 5,
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User does not have required role',
  })
  getStats() {
    return this.reservationsService.getReservationStats();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get reservation by id',
    description: 'Retorna los detalles completos de una reserva específica',
  })
  @ApiResponse({
    status: 200,
    description: 'Reservation found',
  })
  @ApiResponse({
    status: 404,
    description: 'Reservation not found',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.reservationsService.findOne(id);
  }

  @Patch(':id/fulfill')
  @Roles(UserRole.ADMIN, UserRole.LIBRARIAN)
  @ApiOperation({
    summary: 'Mark reservation as fulfilled (Admin/Librarian only)',
    description: `
      Marca una reserva como cumplida (FULFILLED).
      
      **Casos de uso:**
      - Cuando el usuario recoge el libro en el mostrador
      - Antes de crear el préstamo correspondiente
      
      **Validaciones:**
      - La reserva debe estar en estado PENDING
      - La reserva no debe estar expirada
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Reservation fulfilled successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Reservation cannot be fulfilled (wrong status or expired)',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User does not have required role',
  })
  @ApiResponse({
    status: 404,
    description: 'Reservation not found',
  })
  fulfillReservation(@Param('id', ParseUUIDPipe) id: string) {
    return this.reservationsService.fulfillReservation(id);
  }

  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel a reservation',
    description: `
      Cancela una reserva activa.
      
      **Permisos:**
      - Los usuarios pueden cancelar sus propias reservas
      - Admin y Librarian pueden cancelar cualquier reserva
      
      **Proceso:**
      1. Cambia el estado de la reserva a CANCELLED
      2. Libera el ejemplar (cambia a AVAILABLE)
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Reservation cancelled successfully',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'cancelled',
        message: 'Reservation cancelled successfully',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Reservation cannot be cancelled (wrong status or not owner)',
    schema: {
      example: {
        statusCode: 400,
        message: 'You can only cancel your own reservations',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Reservation not found',
  })
  cancelReservation(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
    @Body() cancelReservationDto?: CancelReservationDto,
  ) {
    // Si el usuario no es admin/librarian, solo puede cancelar sus propias reservas
    const isAdminOrLibrarian = [UserRole.ADMIN, UserRole.LIBRARIAN].includes(
      req.user.role,
    );

    return this.reservationsService.cancelReservation(
      id,
      isAdminOrLibrarian ? undefined : req.user.id,
    );
  }

  @Post('expire')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Manually expire overdue reservations (Admin only)',
    description: `
      Expira manualmente todas las reservas vencidas.
      
      **Nota:** Este proceso también se ejecuta automáticamente cada hora mediante un Cron Job.
      
      **Proceso:**
      1. Busca todas las reservas PENDING con expirationDate pasada
      2. Cambia su estado a EXPIRED
      3. Libera los ejemplares asociados (AVAILABLE)
      4. Retorna el número de reservas expiradas
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Expired reservations processed',
    schema: {
      example: {
        message: 'Expired reservations processed successfully',
        expired: 3,
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only admins can manually expire reservations',
  })
  expireReservations() {
    return this.reservationsService.manualExpireReservations();
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a reservation (owner or Admin/Librarian)',
    description: `
      Permite eliminar una reserva. Los usuarios solo pueden eliminar sus propias reservas
      y solo si están en estado PENDING. Admins y Librarians pueden eliminar cualquier reserva.
    `,
  })
  @ApiResponse({ status: 204, description: 'Reservation deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete reservation' })
  @ApiResponse({ status: 404, description: 'Reservation not found' })
  deleteReservation(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    const isAdminOrLibrarian = [UserRole.ADMIN, UserRole.LIBRARIAN].includes(
      req.user.role,
    );

    return this.reservationsService.remove(
      id,
      isAdminOrLibrarian ? undefined : req.user.id,
    );
  }
}
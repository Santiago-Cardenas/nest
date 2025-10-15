import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { CopiesService } from './copies.service';
import { CreateCopyDto } from './dto/create-copy.dto';
import { UpdateCopyDto } from './dto/update-copy.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { Public } from '../auth/decorators/public.decorator';
import { CopyStatus } from './entities/copy.entity';

@ApiTags('copies')
@ApiBearerAuth('JWT-auth')
@Controller('copies')
export class CopiesController {
  constructor(private readonly copiesService: CopiesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.LIBRARIAN)
  @ApiOperation({ summary: 'Create a new copy' })
  @ApiResponse({ status: 201, description: 'Copy created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 409, description: 'Copy with this code already exists' })
  create(@Body() createCopyDto: CreateCopyDto) {
    return this.copiesService.create(createCopyDto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all copies' })
  @ApiResponse({ status: 200, description: 'List of all copies' })
  findAll() {
    return this.copiesService.findAll();
  }

  @Get('available')
  @Public()
  @ApiOperation({ summary: 'Get available copies' })
  @ApiResponse({ status: 200, description: 'List of available copies' })
  findAvailable() {
    return this.copiesService.findAvailable();
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get copy by id' })
  @ApiResponse({ status: 200, description: 'Copy found' })
  @ApiResponse({ status: 404, description: 'Copy not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.copiesService.findOne(id);
  }

  @Get(':id/availability')
  @Public()
  @ApiOperation({ 
    summary: 'Check copy availability including reservations',
    description: `
      Retorna información detallada sobre la disponibilidad de un ejemplar.
      
      **Estados posibles:**
      - AVAILABLE: Disponible para préstamo o reserva
      - RESERVED: Reservado por un usuario
      - BORROWED: Prestado actualmente
      - MAINTENANCE: En mantenimiento
      - LOST: Perdido o extraviado
    `
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Copy availability information',
    schema: {
      example: {
        copyId: '123e4567-e89b-12d3-a456-426614174000',
        code: 'COPY-001-1',
        status: 'available',
        isAvailable: true,
        isReserved: false,
        book: {
          id: '123e4567-e89b-12d3-a456-426614174001',
          title: 'Clean Code',
          author: 'Robert C. Martin',
          isbn: '9780132350884',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Copy not found' })
  async checkAvailability(@Param('id', ParseUUIDPipe) id: string) {
    const copy = await this.copiesService.findOne(id);

    return {
      copyId: copy.id,
      code: copy.code,
      status: copy.status,
      isAvailable: copy.status === CopyStatus.AVAILABLE,
      isReserved: copy.status === CopyStatus.RESERVED,
      isBorrowed: copy.status === CopyStatus.BORROWED,
      book: {
        id: copy.book.id,
        title: copy.book.title,
        author: copy.book.author,
        isbn: copy.book.isbn,
      },
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.LIBRARIAN)
  @ApiOperation({ summary: 'Update copy' })
  @ApiResponse({ status: 200, description: 'Copy updated successfully' })
  @ApiResponse({ status: 404, description: 'Copy not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCopyDto: UpdateCopyDto,
  ) {
    return this.copiesService.update(id, updateCopyDto);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.LIBRARIAN)
  @ApiOperation({ 
    summary: 'Update copy status',
    description: 'Change the status of a copy (available, reserved, borrowed, maintenance, lost)'
  })
  @ApiResponse({ status: 200, description: 'Copy status updated successfully' })
  @ApiResponse({ status: 404, description: 'Copy not found' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: CopyStatus,
  ) {
    return this.copiesService.updateStatus(id, status);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete copy (Admin only)' })
  @ApiResponse({ status: 200, description: 'Copy deleted successfully' })
  @ApiResponse({ status: 404, description: 'Copy not found' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.copiesService.remove(id);
  }
}
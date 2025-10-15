import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { LoansService } from './loans.service';
import { CreateLoanDto } from './dto/create-loan.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('loans')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('loans')
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new loan' })
  @ApiResponse({ status: 201, description: 'Loan created successfully' })
  create(@Request() req, @Body() createLoanDto: CreateLoanDto) {
    return this.loansService.create(req.user.id, createLoanDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.LIBRARIAN)
  @ApiOperation({ summary: 'Get all loans' })
  findAll() {
    return this.loansService.findAll();
  }

  @Get('my')
  @ApiOperation({ summary: 'Get current user loans' })
  findMyLoans(@Request() req) {
    return this.loansService.findUserLoans(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get loan by id' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.loansService.findOne(id);
  }

  @Patch(':id/return')
  @Roles(UserRole.ADMIN, UserRole.LIBRARIAN)
  @ApiOperation({ summary: 'Return a loan' })
  returnLoan(@Param('id', ParseUUIDPipe) id: string) {
    return this.loansService.returnLoan(id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.LIBRARIAN)
  @ApiOperation({ summary: 'Delete a loan (Admin/Librarian only)' })
  @ApiResponse({ status: 200, description: 'Loan deleted successfully' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.loansService.remove(id);
  }
}
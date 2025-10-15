import { PartialType } from '@nestjs/swagger';
import { CreateCopyDto } from './create-copy.dto';

export class UpdateCopyDto extends PartialType(CreateCopyDto) {}
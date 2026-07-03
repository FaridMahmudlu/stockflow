import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { MovementType } from '@prisma/client';

export class CreateMovementDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsEnum(MovementType)
  @IsNotEmpty()
  type: MovementType;

  @IsInt()
  @Min(1)
  @IsNotEmpty()
  quantity: number;

  @IsOptional()
  @IsString()
  reference?: string;
}

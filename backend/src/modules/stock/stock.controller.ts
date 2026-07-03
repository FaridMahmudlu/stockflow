import { Controller, Get, Post, Body, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { StockService } from './stock.service';
import { CreateMovementDto } from './dto/create-movement.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Post('movement')
  createMovement(
    @Body() createMovementDto: CreateMovementDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.stockService.createMovement(createMovementDto, userId);
  }

  @Get('dashboard')
  getDashboardStats() {
    return this.stockService.getDashboardStats();
  }

  @Get('movement')
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('productId') productId?: string,
  ) {
    return this.stockService.findAll(page, limit, productId);
  }
}

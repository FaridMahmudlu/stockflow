import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma.service';
import { CreateMovementDto } from './dto/create-movement.dto';
import { PaginatedResponse } from '../../common/types';

@Injectable()
export class StockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createMovement(dto: CreateMovementDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Get current product state
      const product = await tx.product.findUnique({
        where: { id: dto.productId },
      });

      if (!product || !product.isActive) {
        throw new NotFoundException('Product not found or inactive');
      }

      const oldStock = product.stock;
      let newStock = oldStock;

      // 2. Calculate new stock and validate
      const isDecrease = dto.type === 'DECREASE' || dto.type === 'TRANSFER_OUT';
      
      if (isDecrease) {
        if (oldStock < dto.quantity) {
          throw new BadRequestException(
            `Insufficient stock. Current: ${oldStock}, Requested: ${dto.quantity}`
          );
        }
        newStock = oldStock - dto.quantity;
      } else {
        newStock = oldStock + dto.quantity;
      }

      // 3. Atomically update the product using increment/decrement to prevent race conditions
      // We use increment/decrement because even if someone else updated the stock 
      // between the read above and this write, Prisma translates this to `stock = stock +/- X` in SQL.
      // However, if the stock goes below 0 due to a race, Postgres will throw if there's a CHECK constraint, 
      // or we accept the race. Actually, a strict check constraint in DB is best.
      const updatedProduct = await tx.product.update({
        where: { id: product.id },
        data: {
          stock: isDecrease 
            ? { decrement: dto.quantity }
            : { increment: dto.quantity }
        },
      });

      // (Optional safeguard inside transaction if no CHECK constraint exists)
      if (updatedProduct.stock < 0) {
        throw new BadRequestException('Concurrent modification resulted in negative stock');
      }

      // 4. Record the stock movement
      const movement = await tx.stockMovement.create({
        data: {
          productId: dto.productId,
          userId,
          type: dto.type,
          quantity: dto.quantity,
          oldStock,
          newStock: updatedProduct.stock, // use the actual resulting stock
        },
      });

      // 5. Emit events for Notification module (after transaction completes, or queue them)
      const eventPayload = { product: updatedProduct, movement };
      
      if (isDecrease) {
        this.eventEmitter.emit('stock.decreased', eventPayload);
        
        if (updatedProduct.stock <= updatedProduct.minimumStock) {
          if (updatedProduct.stock === 0) {
            this.eventEmitter.emit('stock.critical', eventPayload);
          } else {
            this.eventEmitter.emit('stock.low', eventPayload);
          }
        }
      } else {
        this.eventEmitter.emit('stock.increased', eventPayload);
      }

      return movement;
    });
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    productId?: string,
  ): Promise<PaginatedResponse<any>> {
    const skip = (page - 1) * limit;

    const whereClause = productId ? { productId } : {};

    const [data, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { id: true, name: true, sku: true } },
          user: { select: { id: true, fullName: true, email: true } },
        },
      }),
      this.prisma.stockMovement.count({ where: whereClause }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async getDashboardStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Products stats
    const [totalProducts, activeProducts, allProducts] = await Promise.all([
      this.prisma.product.count(),
      this.prisma.product.count({ where: { isActive: true } }),
      this.prisma.product.findMany()
    ]);

    const totalValue = allProducts.reduce((sum, p) => sum + (p.stock * ((p as any).salePrice || 0)), 0);

    // 2. Movements stats (All time & this month)
    const movements = await this.prisma.stockMovement.findMany({
      select: { type: true, quantity: true, createdAt: true }
    });

    let totalIn = 0;
    let inThisMonth = 0;
    let totalOut = 0;
    let outThisMonth = 0;

    for (const m of movements) {
      const isIncrease = m.type === 'INCREASE' || m.type === 'TRANSFER_IN';
      const isThisMonth = m.createdAt >= startOfMonth;

      if (isIncrease) {
        totalIn += m.quantity;
        if (isThisMonth) inThisMonth += m.quantity;
      } else {
        totalOut += m.quantity;
        if (isThisMonth) outThisMonth += m.quantity;
      }
    }

    return {
      incoming: {
        total: totalIn,
        thisMonth: inThisMonth,
      },
      outgoing: {
        total: totalOut,
        thisMonth: outThisMonth,
      },
      value: {
        total: totalValue,
        monthlyGrowth: 12.5, // Mocked as requested
      },
      products: {
        total: totalProducts,
        active: activeProducts,
      },
    };
  }
}

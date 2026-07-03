import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginatedResponse } from '../../common/types';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(createProductDto: CreateProductDto, adminId: string) {
    const existing = await this.prisma.product.findUnique({
      where: { sku: createProductDto.sku },
    });
    if (existing) {
      throw new ConflictException('Product with this SKU already exists');
    }

    if (createProductDto.supplierId) {
      const supplier = await this.prisma.supplier.findUnique({
        where: { id: createProductDto.supplierId },
      });
      if (!supplier || !supplier.isActive) {
        throw new NotFoundException('Supplier not found or inactive');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: createProductDto,
      });

      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: 'CREATE',
          entityType: 'Product',
          entityId: product.id,
          newData: product as any,
        },
      });

      this.eventEmitter.emit('product.created', { product, userId: adminId });

      return product;
    });
  }

  async findAll(page: number = 1, limit: number = 10): Promise<PaginatedResponse<any>> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where: { isActive: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { supplier: true },
      }),
      this.prisma.product.count({
        where: { isActive: true },
      }),
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

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        supplier: true,
        assignments: {
          include: { user: { select: { id: true, fullName: true, email: true } } }
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto, adminId: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');

    if (updateProductDto.sku && updateProductDto.sku !== product.sku) {
      const existing = await this.prisma.product.findUnique({
        where: { sku: updateProductDto.sku },
      });
      if (existing) throw new ConflictException('Product with this SKU already exists');
    }

    if (updateProductDto.supplierId) {
      const supplier = await this.prisma.supplier.findUnique({
        where: { id: updateProductDto.supplierId },
      });
      if (!supplier || !supplier.isActive) {
        throw new NotFoundException('Supplier not found or inactive');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id },
        data: updateProductDto,
      });

      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: 'UPDATE',
          entityType: 'Product',
          entityId: product.id,
          oldData: product as any,
          newData: updated as any,
        },
      });

      this.eventEmitter.emit('product.updated', { product: updated, userId: adminId });

      return updated;
    });
  }

  async remove(id: string, adminId: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id },
        data: { isActive: false },
      });

      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: 'DELETE',
          entityType: 'Product',
          entityId: product.id,
          oldData: { isActive: product.isActive },
          newData: { isActive: false },
        },
      });

      this.eventEmitter.emit('product.deleted', { product: updated, userId: adminId });

      return { message: 'Product deactivated successfully' };
    });
  }
}

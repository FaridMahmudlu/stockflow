import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { PaginatedResponse } from '../../common/types';

@Injectable()
export class SuppliersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(createSupplierDto: CreateSupplierDto, adminId: string) {
    return this.prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.create({
        data: createSupplierDto,
      });

      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: 'CREATE',
          entityType: 'Supplier',
          entityId: supplier.id,
          newData: supplier as any,
        },
      });

      // Emit event for Notification module
      this.eventEmitter.emit('supplier.created', supplier);

      return supplier;
    });
  }

  async findAll(page: number = 1, limit: number = 10): Promise<PaginatedResponse<any>> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where: { isDeleted: false },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.supplier.count({
        where: { isDeleted: false },
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
    const supplier = await this.prisma.supplier.findUnique({
      where: { id, isDeleted: false },
      include: {
        products: true,
      },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    return supplier;
  }

  async update(id: string, updateSupplierDto: UpdateSupplierDto, adminId: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id, isDeleted: false } });
    if (!supplier) throw new NotFoundException('Supplier not found');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.supplier.update({
        where: { id },
        data: updateSupplierDto,
      });

      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: 'UPDATE',
          entityType: 'Supplier',
          entityId: supplier.id,
          oldData: supplier as any,
          newData: updated as any,
        },
      });

      // Emit event for Notification module
      this.eventEmitter.emit('supplier.updated', updated);

      return updated;
    });
  }

  async remove(id: string, adminId: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id, isDeleted: false } });
    if (!supplier) throw new NotFoundException('Supplier not found');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.supplier.update({
        where: { id },
        data: { isDeleted: true },
      });

      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: 'DELETE',
          entityType: 'Supplier',
          entityId: supplier.id,
          oldData: { isDeleted: false },
          newData: { isDeleted: true },
        },
      });

      // Emit event for Notification module
      this.eventEmitter.emit('supplier.deleted', updated);

      return { message: 'Supplier deleted successfully' };
    });
  }
}

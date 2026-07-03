import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangeRoleDto } from './dto/change-role.dto';
import { AssignProductsDto } from './dto/assign-products.dto';
import { PaginatedResponse } from '../../common/types';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async create(createUserDto: CreateUserDto, adminId: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const saltRoundsStr = this.configService.get<string>('BCRYPT_SALT_ROUNDS');
    const saltRounds = saltRoundsStr ? parseInt(saltRoundsStr, 10) : 12;
    const password = createUserDto.password || 'Welcome@123';
    const passwordHash = await bcrypt.hash(password, saltRounds);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          fullName: createUserDto.fullName,
          email: createUserDto.email,
          role: createUserDto.role || 'WORKER',
          passwordHash,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: 'CREATE',
          entityType: 'User',
          entityId: user.id,
          newData: { fullName: user.fullName, email: user.email, role: user.role },
        },
      });

      const { passwordHash: _, ...result } = user;
      return result;
    });
  }

  async findAll(page: number = 1, limit: number = 10): Promise<PaginatedResponse<any>> {
    const skip = (page - 1) * limit;
    
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count(),
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
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        productAssignments: {
          include: { product: true }
        }
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { passwordHash, ...result } = user;
    return result;
  }

  async update(id: string, updateUserDto: UpdateUserDto, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });
      if (existing) throw new ConflictException('Email already in use');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: updateUserDto,
      });

      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: 'UPDATE',
          entityType: 'User',
          entityId: user.id,
          oldData: { fullName: user.fullName, email: user.email },
          newData: { fullName: updated.fullName, email: updated.email },
        },
      });

      const { passwordHash: _, ...result } = updated;
      return result;
    });
  }

  async changeRole(id: string, changeRoleDto: ChangeRoleDto, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: { role: changeRoleDto.role },
      });

      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: 'ROLE_CHANGE',
          entityType: 'User',
          entityId: user.id,
          oldData: { role: user.role },
          newData: { role: updated.role },
        },
      });

      const { passwordHash: _, ...result } = updated;
      return result;
    });
  }

  async remove(id: string, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: { isActive: false },
      });

      // Optionally revoke refresh tokens so they can't login anymore
      await tx.refreshToken.updateMany({
        where: { userId: id, revoked: false },
        data: { revoked: true },
      });

      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: 'DELETE',
          entityType: 'User',
          entityId: user.id,
          oldData: { isActive: true },
          newData: { isActive: false },
        },
      });

      return { message: 'User deactivated successfully' };
    });
  }

  async assignProducts(id: string, assignDto: AssignProductsDto, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.$transaction(async (tx) => {
      const assignments = await Promise.all(
        assignDto.productIds.map((productId) =>
          tx.productAssignment.upsert({
            where: {
              productId_userId: { productId, userId: id },
            },
            update: {},
            create: {
              productId,
              userId: id,
            },
          }),
        )
      );

      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: 'UPDATE',
          entityType: 'User',
          entityId: user.id,
          newData: { assignedProductIds: assignDto.productIds },
        },
      });

      return assignments;
    });
  }

  async removeAssignment(userId: string, productId: string, adminId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.productAssignment.delete({
        where: {
          productId_userId: { productId, userId },
        },
      });

      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: 'UPDATE',
          entityType: 'User',
          entityId: userId,
          oldData: { removedProductId: productId },
        },
      });

      return { message: 'Product assignment removed' };
    });
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { GetAuditLogsDto } from './dto/get-audit-logs.dto';
import { PaginatedResponse } from '../../common/types';

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(dto: GetAuditLogsDto): Promise<PaginatedResponse<any>> {
    const page = dto.page || 1;
    const limit = dto.limit || 10;
    const skip = (page - 1) * limit;

    const whereClause: any = {};

    if (dto.userId) {
      whereClause.userId = dto.userId;
    }
    if (dto.action) {
      whereClause.action = dto.action;
    }
    if (dto.entityType) {
      whereClause.entityType = dto.entityType;
    }

    if (dto.startDate || dto.endDate) {
      whereClause.createdAt = {};
      if (dto.startDate) {
        whereClause.createdAt.gte = new Date(dto.startDate);
      }
      if (dto.endDate) {
        whereClause.createdAt.lte = new Date(dto.endDate);
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, fullName: true, email: true, role: true } },
        },
      }),
      this.prisma.auditLog.count({ where: whereClause }),
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
}

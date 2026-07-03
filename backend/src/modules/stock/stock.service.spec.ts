import { Test, TestingModule } from '@nestjs/testing';
import { StockService } from './stock.service';
import { PrismaService } from '../../database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MovementType } from '@prisma/client';

describe('StockService', () => {
  let service: StockService;
  let prisma: PrismaService;
  let eventEmitter: EventEmitter2;

  const mockPrisma = {
    product: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(mockPrisma)),
    stockMovement: {
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<StockService>(StockService);
    prisma = module.get<PrismaService>(PrismaService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createMovement (INCREASE)', () => {
    it('should successfully increase stock and emit events if needed', async () => {
      const dto = {
        productId: 'prod-1',
        type: MovementType.INCREASE,
        quantity: 10,
      };
      const userId = 'user-1';

      const existingProduct = {
        id: 'prod-1',
        name: 'Product A',
        stock: 5,
        minimumStock: 10,
        isActive: true,
      };

      const updatedProduct = { ...existingProduct, stock: 15 };

      mockPrisma.product.findUnique.mockResolvedValue(existingProduct);
      mockPrisma.product.update.mockResolvedValue(updatedProduct);
      mockPrisma.stockMovement.create.mockResolvedValue({
        id: 'move-1',
        ...dto,
        userId,
        oldStock: 5,
        newStock: 15,
      });

      const result = await service.createMovement(dto, userId);

      expect(result.newStock).toBe(15);
      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { stock: { increment: 10 } },
      });
      expect(mockPrisma.stockMovement.create).toHaveBeenCalled();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('stock.increased', expect.any(Object));
    });
  });

  describe('createMovement (DECREASE)', () => {
    it('should throw BadRequestException if stock goes below 0', async () => {
      const dto = {
        productId: 'prod-1',
        type: MovementType.DECREASE,
        quantity: 20,
      };
      const userId = 'user-1';

      const existingProduct = {
        id: 'prod-1',
        name: 'Product A',
        stock: 5,
        minimumStock: 10,
        isActive: true,
      };

      mockPrisma.product.findUnique.mockResolvedValue(existingProduct);

      await expect(service.createMovement(dto, userId)).rejects.toThrow(BadRequestException);
      expect(mockPrisma.product.update).not.toHaveBeenCalled();
    });

    it('should emit stock.critical event if stock drops to 0', async () => {
      const dto = {
        productId: 'prod-1',
        type: MovementType.DECREASE,
        quantity: 5,
      };
      const userId = 'user-1';

      const existingProduct = {
        id: 'prod-1',
        name: 'Product A',
        stock: 5,
        minimumStock: 10,
        isActive: true,
      };

      mockPrisma.product.findUnique.mockResolvedValue(existingProduct);
      mockPrisma.product.update.mockResolvedValue({ ...existingProduct, stock: 0 });

      await service.createMovement(dto, userId);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('stock.critical', expect.any(Object));
    });
  });

  describe('createMovement', () => {
    it('should throw NotFoundException if product not found', async () => {
      const dto = {
        productId: 'invalid-prod',
        type: MovementType.INCREASE,
        quantity: 10,
      };
      const userId = 'user-1';

      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(service.createMovement(dto, userId)).rejects.toThrow(NotFoundException);
    });
  });
});

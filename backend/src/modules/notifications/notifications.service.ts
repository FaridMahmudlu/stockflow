import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsGateway } from './notifications.gateway';
import { PaginatedResponse } from '../../common/types';
import { NotificationType } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

@Injectable()
export class NotificationsService {
  private fcmEnabled = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
    private readonly configService: ConfigService,
  ) {
    const projectId = this.configService.get<string>('firebase.projectId');
    const clientEmail = this.configService.get<string>('firebase.clientEmail');
    let privateKey = this.configService.get<string>('firebase.privateKey');

    if (projectId && clientEmail && privateKey) {
      try {
        if (getApps().length === 0) {
          initializeApp({
            credential: cert({
              projectId,
              clientEmail,
              privateKey,
            }),
          });
        }
        this.fcmEnabled = true;
        console.log('Firebase Admin SDK initialized successfully.');
      } catch (error) {
        console.warn('Firebase Admin SDK failed to initialize:', error);
      }
    } else {
      console.warn('Firebase configuration is missing. Push notifications are disabled.');
    }
  }

  async findAllForUser(userId: string, page: number = 1, limit: number = 10): Promise<PaginatedResponse<any>> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where: { userId } }),
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

  async markAsRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  // Helper to create, write to DB, send push notification and emit WS
  private async createAndEmit(userId: string, type: NotificationType, title: string, message: string) {
    // 1. Create DB Notification row (always succeeds, source of truth)
    const notification = await this.prisma.notification.create({
      data: { userId, type, title, message },
    });

    // 2. Emit over WebSocket (in-app, instant)
    this.gateway.sendNotificationToUser(userId, notification);

    // 3. Send via FCM if enabled
    if (this.fcmEnabled) {
      try {
        const tokens = await this.prisma.deviceToken.findMany({
          where: { userId },
          select: { token: true },
        });

        if (tokens.length > 0) {
          const tokenStrings = tokens.map((t) => t.token);

          const response = await getMessaging().sendEachForMulticast({
            tokens: tokenStrings,
            notification: {
              title,
              body: message,
            },
            data: {
              notificationId: notification.id,
              type: String(type),
            },
          });

          // Delete unregistered/invalid tokens
          const tokensToDelete: string[] = [];
          response.responses.forEach((res: any, idx: number) => {
            if (!res.success && res.error) {
              const errCode = res.error.code;
              if (
                errCode === 'messaging/registration-token-not-registered' ||
                errCode === 'messaging/invalid-argument'
              ) {
                tokensToDelete.push(tokenStrings[idx]);
              }
            }
          });

          if (tokensToDelete.length > 0) {
            await this.prisma.deviceToken.deleteMany({
              where: { token: { in: tokensToDelete } },
            });
            console.log(`Deleted ${tokensToDelete.length} stale device tokens.`);
          }
        }
      } catch (pushError) {
        // Log and do not throw (failures must not rollback DB transactions)
        console.error('Push notification send failed:', pushError);
      }
    }
  }

  // Helper to notify all active users (Admins, Managers, and Workers)
  private async notifyAllActiveUsers(type: NotificationType, title: string, message: string) {
    const targetUsers = await this.prisma.user.findMany({
      where: { isActive: true },
    });

    for (const user of targetUsers) {
      await this.createAndEmit(user.id, type, title, message);
    }
  }

  // Helper to notify all admins and managers
  private async notifyAdminsAndManagers(type: NotificationType, title: string, message: string) {
    const targetUsers = await this.prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'MANAGER'] }, isActive: true },
    });

    for (const user of targetUsers) {
      await this.createAndEmit(user.id, type, title, message);
    }
  }

  // Helper to notify assigned users of a product
  private async notifyProductAssignees(productId: string, type: NotificationType, title: string, message: string) {
    const assignments = await this.prisma.productAssignment.findMany({
      where: { productId },
      include: { user: true },
    });

    for (const assignment of assignments) {
      if (assignment.user.isActive) {
        await this.createAndEmit(assignment.user.id, type, title, message);
      }
    }
  }

  // --- EVENT LISTENERS ---

  private async getUserName(userId?: string): Promise<string> {
    if (!userId) return 'Sistem';
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      return user ? (user.fullName || user.email.split('@')[0]) : 'Sistem';
    } catch {
      return 'Sistem';
    }
  }

  @OnEvent('stock.critical')
  async handleStockCritical(payload: any) {
    const { product, movement } = payload;
    const userName = await this.getUserName(movement?.userId);
    const title = '🚨 Kritik Vəziyyət!';
    const message = `${userName} tərəfindən edilən əməliyyat nəticəsində "${product.name}" (SKU: ${product.sku}) məhsulu anbarda tamamilə bitdi! 📉`;
    
    await this.notifyAllActiveUsers('STOCK_CRITICAL' as NotificationType, title, message);
    this.gateway.sendStockUpdate(product.id, product.stock);
  }

  @OnEvent('stock.low')
  async handleStockLow(payload: any) {
    const { product, movement } = payload;
    const userName = await this.getUserName(movement?.userId);
    const title = '⚠️ Stok Tükənir!';
    const message = `${userName} tərəfindən edilən əməliyyatdan sonra "${product.name}" (SKU: ${product.sku}) məhsulunun sayı minimum həddə çatdı. Cari qalıq: ${product.stock} ədəd (Limit: ${product.minimumStock} ədəd). 🛒`;
    
    await this.notifyAllActiveUsers('STOCK_LOW' as NotificationType, title, message);
    this.gateway.sendStockUpdate(product.id, product.stock);
  }

  @OnEvent('stock.decreased')
  async handleStockDecreased(payload: any) {
    const { product, movement } = payload;
    const userName = await this.getUserName(movement?.userId);
    const title = '📤 Stok Çıxışı';
    const message = `${userName} tərəfindən "${product.name}" (SKU: ${product.sku}) məhsulundan ${movement.quantity} ədəd çıxarıldı. Qalıq: ${movement.oldStock} ➔ ${movement.newStock} ədəd. 👇`;
    await this.notifyAllActiveUsers('STOCK_DECREASED' as NotificationType, title, message);
    this.gateway.sendStockUpdate(product.id, product.stock);
  }

  @OnEvent('stock.increased')
  async handleStockIncreased(payload: any) {
    const { product, movement } = payload;
    const userName = await this.getUserName(movement?.userId);
    const title = '🚀 Yeni Stok Gəldi!';
    const message = `${userName} tərəfindən "${product.name}" (SKU: ${product.sku}) məhsulundan ${movement.quantity} ədəd daxil edildi. Qalıq: ${movement.oldStock} ➔ ${movement.newStock} ədəd. 📦`;
    await this.notifyAllActiveUsers('STOCK_INCREASED' as NotificationType, title, message);
    this.gateway.sendStockUpdate(product.id, product.stock);
  }

  @OnEvent('supplier.created')
  async handleSupplierCreated(payload: any) {
    const supplier = payload.supplier || payload;
    const userName = await this.getUserName(payload.userId);
    const title = '🤝 Yeni Əməkdaşlıq!';
    const message = `${userName} tərəfindən "${supplier.name}" şirkəti ilə yeni təchizatçı əməkdaşlığı başladıldı. 🎉`;
    await this.notifyAllActiveUsers('SUPPLIER_CREATED' as NotificationType, title, message);
  }

  @OnEvent('supplier.updated')
  async handleSupplierUpdated(payload: any) {
    const supplier = payload.supplier || payload;
    const userName = await this.getUserName(payload.userId);
    const title = '📋 Təchizatçı Yeniləndi';
    const message = `${userName} tərəfindən "${supplier.name}" təchizatçısının məlumatları redaktə olundu. 📝`;
    await this.notifyAllActiveUsers('SUPPLIER_UPDATED' as NotificationType, title, message);
  }

  @OnEvent('supplier.deleted')
  async handleSupplierDeleted(payload: any) {
    const supplier = payload.supplier || payload;
    const userName = await this.getUserName(payload.userId);
    const title = '❌ Təchizatçı Silindi';
    const message = `${userName} tərəfindən "${supplier.name}" təchizatçısı sistemdən silindi.`;
    await this.notifyAllActiveUsers('GENERAL' as NotificationType, title, message);
  }

  @OnEvent('product.created')
  async handleProductCreated(payload: any) {
    const product = payload.product || payload;
    const userName = await this.getUserName(payload.userId);
    const title = '✨ Yeni Məhsul!';
    const message = `${userName} tərəfindən "${product.name}" (SKU: ${product.sku}) adlı məhsul sistemə əlavə edildi. 🆕`;
    await this.notifyAllActiveUsers('PRODUCT_CREATED' as NotificationType, title, message);
  }

  @OnEvent('product.updated')
  async handleProductUpdated(payload: any) {
    const product = payload.product || payload;
    const userName = await this.getUserName(payload.userId);
    const title = '✏️ Məhsul Yeniləndi';
    const message = `${userName} tərəfindən "${product.name}" (SKU: ${product.sku}) məhsulu haqqında məlumatlar redaktə olundu. 📝`;
    await this.notifyAllActiveUsers('PRODUCT_UPDATED' as NotificationType, title, message);
  }

  @OnEvent('product.deleted')
  async handleProductDeleted(payload: any) {
    const product = payload.product || payload;
    const userName = await this.getUserName(payload.userId);
    const title = '🗑️ Məhsul Silindi';
    const message = `${userName} tərəfindən "${product.name}" məhsulu anbardan silindi.`;
    await this.notifyAllActiveUsers('PRODUCT_DELETED' as NotificationType, title, message);
  }
}

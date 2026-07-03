import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  // Client emits 'join' with their userId to start receiving notifications
  @SubscribeMessage('join')
  handleJoin(@MessageBody() userId: string, @ConnectedSocket() client: Socket) {
    client.join(userId);
    console.log(`Client ${client.id} joined room ${userId}`);
    return { event: 'joined', data: userId };
  }

  // Helper method to emit notifications to a specific user
  sendNotificationToUser(userId: string, notification: any) {
    this.server.to(userId).emit('notification', notification);
    this.server.to(userId).emit('newNotification', notification);
  }

  // Helper method to emit stock updates to all clients
  sendStockUpdate(productId: string, newStock: number) {
    this.server.emit('stock:updated', { productId, newStock });
  }
}

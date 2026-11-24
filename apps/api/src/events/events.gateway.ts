import {
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { getJwtSecret } from '../auth/utils/jwt-secret.util';

const allowedWsOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

@WebSocketGateway({
  cors: {
    origin: allowedWsOrigins,
    credentials: true,
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(EventsGateway.name);

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    const rawToken =
      (client.handshake?.auth?.token as string | undefined) ||
      (typeof client.handshake?.headers?.authorization === 'string'
        ? client.handshake.headers.authorization.replace(/^Bearer\s+/i, '')
        : undefined);

    if (!rawToken) {
      this.logger.warn(`[WS] Conexão rejeitada (sem token JWT): ${client.id}`);
      client.disconnect(true);
      return;
    }

    try {
      const payload = jwt.verify(rawToken, getJwtSecret()) as { sub?: string };
      if (!payload?.sub) {
        client.disconnect(true);
        return;
      }
      client.data.userId = payload.sub;
    } catch {
      this.logger.warn(`[WS] Conexão rejeitada (token JWT inválido/expirado): ${client.id}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(_client: Socket) {}
}

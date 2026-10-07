import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { DbService } from '../../../database/db.service';
import { resolveIsSuperAdmin } from '../../../common/auth/super-admin';
import {
  SupportTicketEntity,
  SupportTicketMessageEntity,
} from '../domain/entities/support-ticket.entity';

interface JwtPayload {
  sub: string;
  email?: string;
  sessionId?: string;
}

interface SocketState {
  userId: string;
  isAgent: boolean;
  isSuperAdmin: boolean;
  orgIds: string[];
}

/**
 * Retransmision en tiempo real de los tickets de soporte.
 *
 * EL SOCKET NUNCA ESCRIBE. Todas las mutaciones entran por REST, pasan por los
 * guards de siempre y solo despues el usecase llama a `emitMessage` /
 * `emitTicket`. Consecuencias buscadas:
 *   - un unico camino de autorizacion, sin una segunda copia de las reglas;
 *   - si el socket se cae, la pantalla degrada a polling y no se pierde nada.
 *
 * Autenticacion del handshake por `socket.handshake.auth`: el navegador no puede
 * poner una cabecera Authorization en un WebSocket. Se verifica con el mismo
 * JwtService y el mismo secreto que JwtAuthGuard.
 */
@Injectable()
@WebSocketGateway({
  namespace: '/support',
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : []),
    ],
    credentials: true,
  },
})
export class SupportGateway implements OnGatewayConnection {
  private readonly logger = new Logger(SupportGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly db: DbService,
  ) {}

  async handleConnection(socket: Socket): Promise<void> {
    const token = typeof socket.handshake.auth?.token === 'string'
      ? socket.handshake.auth.token
      : null;

    if (!token) {
      socket.disconnect(true);
      return;
    }

    const secret =
      this.configService.get<string>('JWT_ACCESS_SECRET') ?? 'dev_access_secret_change_me';

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token, { secret });
    } catch {
      socket.disconnect(true);
      return;
    }

    try {
      // El super admin se identifica por variable de entorno, no por una fila:
      // sin resolverlo aqui, app.is_support_agent() daba false y quien atiende
      // los tickets no entraba a la sala de agentes ni recibia nada en vivo.
      const configuredAdmin = resolveIsSuperAdmin(payload, this.configService);
      const [account] = await this.db.withContextQuery<{platform_role:string|null;status:string;revoked:boolean;expired:boolean}[]>(payload.sub,null,configuredAdmin,c=>c.query(
        `SELECT u.platform_role,u.status,s.revoked,s.expires_at < now() AS expired FROM users u JOIN sessions s ON s.user_id=u.id AND s.id=$2 WHERE u.id=$1 AND u.deleted_at IS NULL`,[payload.sub,payload.sessionId??null]));
      if(!account || account.status!=='active' || account.revoked || account.expired || account.platform_role==='accountant') {
        socket.disconnect(true); return;
      }
      const isSuperAdmin = account.platform_role === 'super_admin' || (!account.platform_role && configuredAdmin);
      const state = await this.resolveState(payload.sub, isSuperAdmin);
      socket.data.state = state;

      // Las salas se derivan de la membresia del token, no de lo que el cliente
      // pida: sin esto cualquiera podria unirse a la sala de otra organizacion.
      for (const orgId of state.orgIds) {
        await socket.join(orgRoom(orgId));
      }
      if (state.isAgent) {
        await socket.join(AGENTS_ROOM);
      }
    } catch (error) {
      this.logger.error('No se pudo resolver el contexto del socket', error as Error);
      socket.disconnect(true);
    }
  }

  /**
   * El cliente pide seguir un ticket concreto para recibir sus mensajes. Se
   * comprueba contra la BD bajo RLS: si no lo puede leer, no entra a la sala.
   */
  @SubscribeMessage('ticket:subscribe')
  async subscribeToTicket(socket: Socket, ticketId: unknown): Promise<{ ok: boolean }> {
    const state = socket.data.state as SocketState | undefined;
    if (!state || typeof ticketId !== 'string') {
      return { ok: false };
    }

    const visible = await this.db.withContextQuery<{ id: string }[]>(
      state.userId,
      null,
      state.isSuperAdmin,
      (client) =>
        client.query<{ id: string }>('SELECT id FROM support_tickets WHERE id = $1::uuid', [
          ticketId,
        ]),
    );

    if (visible.length === 0) {
      return { ok: false };
    }

    await socket.join(ticketRoom(ticketId));
    return { ok: true };
  }

  @SubscribeMessage('ticket:unsubscribe')
  async unsubscribeFromTicket(socket: Socket, ticketId: unknown): Promise<{ ok: boolean }> {
    if (typeof ticketId !== 'string') return { ok: false };
    await socket.leave(ticketRoom(ticketId));
    return { ok: true };
  }

  /** Lo llama el usecase DESPUES de persistir. Nunca al reves. */
  emitMessage(orgId: string, ticketId: string, message: SupportTicketMessageEntity): void {
    this.server
      ?.to([ticketRoom(ticketId), orgRoom(orgId), AGENTS_ROOM])
      .emit('ticket:message', { ticketId, message });
  }

  /** Cambios de estado, prioridad o asignacion, y tickets nuevos. */
  emitTicket(ticket: SupportTicketEntity): void {
    this.server
      ?.to([ticketRoom(ticket.id), orgRoom(ticket.orgId), AGENTS_ROOM])
      .emit('ticket:updated', { ticket });
  }

  private async resolveState(userId: string, isSuperAdmin: boolean): Promise<SocketState> {
    const rows = await this.db.withContextQuery<{ org_id: string }[]>(
      userId,
      null,
      isSuperAdmin,
      (client) =>
        client.query<{ org_id: string }>(
          `SELECT org_id FROM org_members
           WHERE user_id = $1::uuid AND deleted_at IS NULL AND status = 'active'`,
          [userId],
        ),
    );

    const [agentRow] = await this.db.withContextQuery<{ is_agent: boolean }[]>(
      userId,
      null,
      isSuperAdmin,
      (client) => client.query<{ is_agent: boolean }>('SELECT app.is_support_agent() AS is_agent'),
    );

    return {
      userId,
      isAgent: isSuperAdmin || (agentRow?.is_agent ?? false),
      isSuperAdmin,
      orgIds: rows.map((row) => row.org_id),
    };
  }
}

const AGENTS_ROOM = 'support:agents';
const orgRoom = (orgId: string) => `org:${orgId}`;
const ticketRoom = (ticketId: string) => `ticket:${ticketId}`;

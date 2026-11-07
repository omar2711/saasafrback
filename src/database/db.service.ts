import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolClient } from 'pg';

export interface RlsContext {
  userId?: string | null;
  orgId?: string | null;
  memberId?: string | null;
  isSuperAdmin?: boolean;
}

export interface DbClient {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  execute(sql: string, params?: unknown[]): Promise<void>;
}

function wrapClient(poolClient: PoolClient): DbClient {
  return {
    query: async <T>(sql: string, params?: unknown[]): Promise<T[]> => {
      const result = await poolClient.query(sql, params as never[]);
      return result.rows as T[];
    },
    execute: async (sql: string, params?: unknown[]): Promise<void> => {
      await poolClient.query(sql, params as never[]);
    },
  };
}

@Injectable()
export class DbService implements OnModuleInit, OnModuleDestroy {
  private pool!: Pool;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const integer = (key: string, fallback: number) => {
      const value = Number(this.config.get(key) ?? fallback);
      if (!Number.isInteger(value) || value < 1) throw new Error(`${key} must be a positive integer`);
      return value;
    };
    this.pool = new Pool({
      connectionString: this.config.get<string>('DATABASE_URL'),
      max: integer('DB_POOL_MAX', process.env.VERCEL ? 5 : 10),
      connectionTimeoutMillis: integer('DB_CONNECTION_TIMEOUT_MS', 5000),
      idleTimeoutMillis: integer('DB_IDLE_TIMEOUT_MS', 30000),
      statement_timeout: integer('DB_STATEMENT_TIMEOUT_MS', 15000),
      idle_in_transaction_session_timeout: integer('DB_TRANSACTION_IDLE_TIMEOUT_MS', 15000),
      application_name: 'afr-sales',
    });
    this.pool.on('error', () => { console.error('PostgreSQL idle connection failed'); });
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  async query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]> {
    const result = await this.pool.query(sql, params as never[]);
    return result.rows as T[];
  }

  async execute(sql: string, params?: unknown[]): Promise<void> {
    await this.pool.query(sql, params as never[]);
  }

  async withRls<T>(context: RlsContext, callback: (client: DbClient) => Promise<T>): Promise<T> {
    const poolClient = await this.pool.connect();
    const client = wrapClient(poolClient);
    const lit = (v: string | null | undefined) =>
      v == null ? 'NULL' : poolClient.escapeLiteral(v);
    try {
      // BEGIN y contexto en un solo viaje a la base.
      await poolClient.query(
        `BEGIN; SELECT app.set_context(${lit(context.userId)}::uuid, ${lit(context.orgId)}::uuid, ${lit(context.memberId)}::uuid, ${context.isSuperAdmin ? 'true' : 'false'})`,
      );
      const result = await callback(client);
      await poolClient.query('COMMIT');
      return result;
    } catch (err) {
      await poolClient.query('ROLLBACK');
      throw err;
    } finally {
      poolClient.release();
    }
  }
  async transaction<T>(callback: (client: DbClient) => Promise<T>): Promise<T> {
    const poolClient = await this.pool.connect();
    const client = wrapClient(poolClient);
    try {
      await poolClient.query('BEGIN');
      const result = await callback(client);
      await poolClient.query('COMMIT');
      return result;
    } catch (err) {
      await poolClient.query('ROLLBACK');
      throw err;
    } finally {
      poolClient.release();
    }
  }

  async withContextQuery<T>(
    userId: string | null,
    orgId: string | null,
    isSuperAdmin: boolean,
    callback: (client: DbClient) => Promise<T>,
  ): Promise<T> {
    const poolClient = await this.pool.connect();
    const client = wrapClient(poolClient);
    try {
      // BEGIN y variables de contexto en un solo viaje a la base.
      await poolClient.query(
        `BEGIN; SELECT set_config('app.user_id', ${poolClient.escapeLiteral(userId ?? '')}, true),
                set_config('app.org_id', ${poolClient.escapeLiteral(orgId ?? '')}, true),
                set_config('app.member_id', '', true),
                set_config('app.is_super_admin', '${isSuperAdmin ? 'true' : 'false'}', true)`,
      );
      return await callback(client);
    } finally {
      // Solo lectura: el ROLLBACK no se espera para responder. El cliente no
      // vuelve al pool hasta que termina, así que nadie lo reutiliza antes.
      poolClient.query('ROLLBACK').then(
        () => poolClient.release(),
        (err: Error) => poolClient.release(err),
      );
    }
  }
}

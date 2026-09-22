import { Module, Global, OnApplicationShutdown, Inject } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { DRIZZLE_PROVIDER, PG_CONNECTION_POOL, type DrizzleDB } from './database.constants';
import * as schema from './schema';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: PG_CONNECTION_POOL,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): Pool => {
        const isProd = configService.get<string>('NODE_ENV') === 'production';
        const connectionString = configService.get<string>('DATABASE_URL');

        if (!connectionString && isProd) {
          throw new Error('CRITICAL SECURITY ERROR: DATABASE_URL is not defined in production environment');
        }

        const effectiveConnectionString =
          connectionString || 'postgresql://postgres:postgrespassword@localhost:5432/opspulse_db';

        const pool = new Pool({
          connectionString: effectiveConnectionString,
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
          ssl:
            configService.get<string>('DB_SSL') === 'true'
              ? { rejectUnauthorized: false }
              : false,
        });

        pool.on('error', (err) => {
          // Prevent unhandled errors from breaking the process
          console.error('Unexpected error on idle PostgreSQL client', err);
        });

        return pool;
      },
    },
    {
      provide: DRIZZLE_PROVIDER,
      inject: [PG_CONNECTION_POOL],
      useFactory: (pool: Pool): DrizzleDB => {
        return drizzle(pool, { schema });
      },
    },
  ],
  exports: [DRIZZLE_PROVIDER, PG_CONNECTION_POOL],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(PG_CONNECTION_POOL) private readonly pool: Pool) {}

  async onApplicationShutdown(signal?: string): Promise<void> {
    console.log(`Closing PostgreSQL pool due to application shutdown (${signal || 'none'})...`);
    await this.pool.end();
  }
}

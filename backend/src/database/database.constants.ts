import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

export const DRIZZLE_PROVIDER = 'DRIZZLE_PROVIDER';
export const PG_CONNECTION_POOL = 'PG_CONNECTION_POOL';

export type DrizzleDB = NodePgDatabase<typeof schema>;

import { NodePgDatabase, NodePgQueryResultHKT } from 'drizzle-orm/node-postgres';
import { PgTransaction } from 'drizzle-orm/pg-core';
import { ExtractTablesWithRelations } from 'drizzle-orm';
import * as schema from './schema';

export const DRIZZLE_PROVIDER = 'DRIZZLE_PROVIDER';
export const PG_CONNECTION_POOL = 'PG_CONNECTION_POOL';

export type DrizzleDB = NodePgDatabase<typeof schema>;
export type DrizzleTransaction = PgTransaction<
  NodePgQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;
export type DrizzleClient = DrizzleDB | DrizzleTransaction;


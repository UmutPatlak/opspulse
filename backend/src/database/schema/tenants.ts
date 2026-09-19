import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { relations, type InferSelectModel, type InferInsertModel } from 'drizzle-orm';
import { users } from './users';
import { tasks } from './tasks';
import { auditLogs } from './audit_logs';

export const tenants = pgTable('tenants', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  status: varchar('status', { length: 50 }).notNull().default('ACTIVE'), // 'ACTIVE', 'SUSPENDED'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  tasks: many(tasks),
  auditLogs: many(auditLogs),
}));

export type Tenant = InferSelectModel<typeof tenants>;
export type NewTenant = InferInsertModel<typeof tenants>;

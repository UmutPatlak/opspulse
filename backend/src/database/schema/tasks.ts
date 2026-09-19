import { pgTable, uuid, varchar, text, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { relations, type InferSelectModel, type InferInsertModel } from 'drizzle-orm';
import { tenants } from './tenants';
import { users } from './users';

export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  assignedUserId: uuid('assigned_user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  priority: varchar('priority', { length: 50 }).notNull().default('MEDIUM'), // 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
  status: varchar('status', { length: 50 }).notNull().default('PENDING'), // 'PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'FAILED'
  metadata: jsonb('metadata'),
  dueDate: timestamp('due_date', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const tasksRelations = relations(tasks, ({ one }) => ({
  tenant: one(tenants, {
    fields: [tasks.tenantId],
    references: [tenants.id],
  }),
  assignedUser: one(users, {
    fields: [tasks.assignedUserId],
    references: [users.id],
  }),
}));

export type Task = InferSelectModel<typeof tasks>;
export type NewTask = InferInsertModel<typeof tasks>;

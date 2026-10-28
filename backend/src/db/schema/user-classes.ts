import { int, mysqlEnum, mysqlTable, timestamp, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';
import { educationClasses } from './education-classes';
import { users } from './users';

// Pemetaan guru (role editor/admin) ke kelas master. Satu guru boleh
// terpetakan ke banyak kelas; kelas master sendiri tetap hanya dibuat
// admin. Kolom source + created_by + created_at adalah catatan audit
// petaan: 'admin' = ditetapkan admin, 'self' = dipilih sendiri oleh guru.
export const userClasses = mysqlTable('user_classes', {
  id: int('id').autoincrement().primaryKey(),
  user_id: int('user_id').notNull().references(() => users.id),
  class_id: int('class_id').notNull().references(() => educationClasses.id),
  source: mysqlEnum('source', ['admin', 'self']).notNull().default('admin'),
  created_by: varchar('created_by', { length: 100 }),
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => [uniqueIndex('user_classes_user_id_class_id_unique').on(table.user_id, table.class_id)]);

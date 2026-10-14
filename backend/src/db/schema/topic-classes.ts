import { int, mysqlTable, primaryKey } from 'drizzle-orm/mysql-core';
import { educationClasses } from './education-classes';
import { topics } from './topics';

export const topicClasses = mysqlTable('topic_classes', {
  topic_id: int('topic_id').notNull().references(() => topics.id),
  class_id: int('class_id').notNull().references(() => educationClasses.id),
}, (table) => [primaryKey({ columns: [table.topic_id, table.class_id] })]);

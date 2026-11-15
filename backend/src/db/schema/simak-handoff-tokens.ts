import { int, mysqlTable, timestamp, varchar } from 'drizzle-orm/mysql-core';

// Token serah-terima (handoff) SIMAK -> RUAS untuk Hub Murid Tahap 2.
// Hanya hash SHA-256 token yang disimpan; token mentah hanya hidup di URL
// yang dikembalikan ke server SIMAK. Token berlaku 60 detik, sekali pakai,
// terikat pada username dan target (dashboard / topik asesmen).
export const simakHandoffTokens = mysqlTable('simak_handoff_tokens', {
  id: int('id').autoincrement().primaryKey(),
  token_hash: varchar('token_hash', { length: 64 }).notNull().unique(),
  username: varchar('username', { length: 100 }).notNull(),
  target_type: varchar('target_type', { length: 20 }).notNull(),
  target_topic_id: int('target_topic_id'),
  target_subject_id: int('target_subject_id'),
  expires_at: timestamp('expires_at').notNull(),
  used_at: timestamp('used_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

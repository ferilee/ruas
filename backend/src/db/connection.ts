import mysql from 'mysql2/promise';
import { loadConfig } from '../config';

export function createPool(options: { multipleStatements?: boolean } = {}) {
  const config = loadConfig();

  return mysql.createPool({
    host: config.DB_HOST,
    port: config.DB_PORT,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    database: config.DB_NAME,
    connectionLimit: 10,
    namedPlaceholders: true,
    multipleStatements: options.multipleStatements ?? false,
  });
}

export type Pool = ReturnType<typeof createPool>;

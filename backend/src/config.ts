import fs from 'node:fs';
import path from 'node:path';

interface RawEnvMap {
  [key: string]: string | undefined;
}

export interface AppConfig {
  APP_PORT: number;
  FRONTEND_PORT: number;
  APP_USERNAME: string;
  SCHOOL_NAME: string;
  APP_PASSWORD: string;
  ADMIN_PASSWORD: string;
  EXAM_EXIT_PASSWORD: string;
  CORS_ORIGIN: string;
  DB_HOST: string;
  DB_PORT: number;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_NAME: string;
  RUSTFS_ENDPOINT: string;
  RUSTFS_PUBLIC_ENDPOINT: string;
  RUSTFS_ACCESS_KEY: string;
  RUSTFS_SECRET_KEY: string;
  RUSTFS_BUCKET: string;
  RUSTFS_REGION: string;
}

let cachedConfig: AppConfig | null = null;

function readEnvFile(): RawEnvMap {
  const envPath = path.join(process.cwd(), '..', '.env');

  if (!fs.existsSync(envPath)) {
    return {};
  }

  const raw = fs.readFileSync(envPath, 'utf8');
  const values: RawEnvMap = {};

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;

    values[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }

  return values;
}

function getEnvValue(processValue: string | undefined, fileValue: string | undefined, fallback: string): string {
  if (processValue && processValue.length > 0) return processValue;
  if (fileValue && fileValue.length > 0) return fileValue;
  return fallback;
}

export function loadConfig(): AppConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const fileEnv = readEnvFile();

  const frontendPort = Number(getEnvValue(process.env.FRONTEND_PORT, fileEnv.FRONTEND_PORT, '5173')) || 5173;
  const adminPassword = getEnvValue(process.env.ADMIN_PASSWORD, fileEnv.ADMIN_PASSWORD, '');

  cachedConfig = {
    APP_PORT: Number(getEnvValue(process.env.APP_PORT, fileEnv.APP_PORT, '3000')) || 3000,
    FRONTEND_PORT: frontendPort,
    APP_USERNAME: getEnvValue(process.env.APP_USERNAME, fileEnv.APP_USERNAME, ''),
    SCHOOL_NAME: getEnvValue(process.env.SCHOOL_NAME, fileEnv.SCHOOL_NAME, ''),
    APP_PASSWORD: getEnvValue(process.env.APP_PASSWORD, fileEnv.APP_PASSWORD, ''),
    ADMIN_PASSWORD: adminPassword,
    EXAM_EXIT_PASSWORD: getEnvValue(process.env.EXAM_EXIT_PASSWORD, fileEnv.EXAM_EXIT_PASSWORD, adminPassword),
    CORS_ORIGIN: getEnvValue(process.env.CORS_ORIGIN, fileEnv.CORS_ORIGIN, `http://localhost:${frontendPort}`),
    DB_HOST: getEnvValue(process.env.DB_HOST, fileEnv.DB_HOST, '127.0.0.1'),
    DB_PORT: Number(getEnvValue(process.env.DB_PORT, fileEnv.DB_PORT, '3306')) || 3306,
    DB_USER: getEnvValue(process.env.DB_USER, fileEnv.DB_USER, 'root'),
    DB_PASSWORD: getEnvValue(process.env.DB_PASSWORD, fileEnv.DB_PASSWORD, ''),
    DB_NAME: getEnvValue(process.env.DB_NAME, fileEnv.DB_NAME, 'ruas_belajar'),
    RUSTFS_ENDPOINT: getEnvValue(process.env.RUSTFS_ENDPOINT, fileEnv.RUSTFS_ENDPOINT, ''),
    RUSTFS_PUBLIC_ENDPOINT: getEnvValue(process.env.RUSTFS_PUBLIC_ENDPOINT, fileEnv.RUSTFS_PUBLIC_ENDPOINT, ''),
    RUSTFS_ACCESS_KEY: getEnvValue(process.env.RUSTFS_ACCESS_KEY, fileEnv.RUSTFS_ACCESS_KEY, ''),
    RUSTFS_SECRET_KEY: getEnvValue(process.env.RUSTFS_SECRET_KEY, fileEnv.RUSTFS_SECRET_KEY, ''),
    RUSTFS_BUCKET: getEnvValue(process.env.RUSTFS_BUCKET, fileEnv.RUSTFS_BUCKET, 'ruas-media'),
    RUSTFS_REGION: getEnvValue(process.env.RUSTFS_REGION, fileEnv.RUSTFS_REGION, 'us-east-1'),
  };

  return cachedConfig;
}

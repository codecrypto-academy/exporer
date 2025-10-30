import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno desde .env en la raíz del proyecto
dotenv.config({ path: path.join(__dirname, '../../../.env') });

export const config = {
  // PostgreSQL
  database: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'mi_contraseña',
    database: process.env.POSTGRES_DB || 'ethereum_events',
    connectionString: process.env.POSTGRES_CONNECTION,
  },

  // ActiveMQ
  activemq: {
    url: process.env.ACTIVEMQ_URL || 'ws://localhost:61614',
    host: process.env.ACTIVEMQ_HOST || 'localhost',
    port: parseInt(process.env.ACTIVEMQ_PORT || '61614', 10),
    username: process.env.ACTIVEMQ_USERNAME || 'guest',
    password: process.env.ACTIVEMQ_PASSWORD || 'guest',
    queues: {
      blocks: 'ethereum.blocks.queue',
      retries: 'ethereum.blocks.retry.queue',
      deadLetter: 'ethereum.blocks.deadletter.queue',
    },
  },

  // Ethereum
  ethereum: {
    startBlock: parseInt(process.env.ETHEREUM_START_BLOCK || '18000000', 10),
    endBlock: parseInt(process.env.ETHEREUM_END_BLOCK || '18001000', 10),
    blocksPerMessage: parseInt(process.env.BLOCKS_PER_MESSAGE || '100', 10),
  },

  // Workers
  worker: {
    instances: parseInt(process.env.WORKER_INSTANCES || '5', 10),
    maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
    retryDelay: parseInt(process.env.RETRY_DELAY_MS || '5000', 10),
  },

  // APIs externas
  apis: {
    fourByteDirectory: process.env.FOURBYTE_API_URL || 'https://www.4byte.directory/api/v1/event-signatures/',
  },

  // General
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
};

// Validar configuración requerida
export function validateConfig(): void {
  const requiredVars = [
    'POSTGRES_HOST',
    'POSTGRES_USER',
    'POSTGRES_PASSWORD',
    'POSTGRES_DB',
    'ACTIVEMQ_URL',
  ];

  const missing = requiredVars.filter(
    (varName) => !process.env[varName]
  );

  if (missing.length > 0 && config.nodeEnv === 'production') {
    console.warn(
      `⚠️  Missing environment variables in production: ${missing.join(', ')}`
    );
  }
}

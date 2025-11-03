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

  // RabbitMQ
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
    queues: {
      blocks: 'ethereum_blocks_queue',
      retries: 'ethereum_blocks_retry_queue',
      deadLetter: 'ethereum_blocks_dead_letter_queue',
    },
  },

  // Ethereum
  ethereum: {
    startBlock: parseInt(process.env.ETHEREUM_START_BLOCK || '18000000', 10),
    endBlock: parseInt(process.env.ETHEREUM_END_BLOCK || '18000100', 10),
    blocksPerMessage: parseInt(process.env.BLOCKS_PER_MESSAGE || '10', 10),
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
    'RABBITMQ_URL',
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

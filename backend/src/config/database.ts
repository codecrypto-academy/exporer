import { Pool, PoolClient, QueryResult } from 'pg';
import { config } from './environment';
import { logger } from '../utils/logger';

class Database {
  private pool: Pool | null = null;

  /**
   * Inicializa el pool de conexiones a PostgreSQL
   */
  public async connect(): Promise<void> {
    try {
      this.pool = new Pool({
        host: config.database.host,
        port: config.database.port,
        user: config.database.user,
        password: config.database.password,
        database: config.database.database,
        max: 20, // Máximo de conexiones en el pool
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      // Probar la conexión
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      logger.info('✅ Conexión a PostgreSQL establecida correctamente');
    } catch (error) {
      logger.error('❌ Error al conectar a PostgreSQL:', error);
      throw error;
    }
  }

  /**
   * Ejecuta una query SQL
   */
  public async query(text: string, params?: any[]): Promise<QueryResult> {
    if (!this.pool) {
      throw new Error('Database pool no está inicializado. Llama a connect() primero.');
    }

    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;

      logger.debug('Executed query', { text, duration, rows: result.rowCount });
      return result;
    } catch (error) {
      logger.error('Error en query:', { text, error });
      throw error;
    }
  }

  /**
   * Obtiene un cliente del pool para transacciones
   */
  public async getClient(): Promise<PoolClient> {
    if (!this.pool) {
      throw new Error('Database pool no está inicializado. Llama a connect() primero.');
    }
    return this.pool.connect();
  }

  /**
   * Cierra el pool de conexiones
   */
  public async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      logger.info('🔌 Conexión a PostgreSQL cerrada');
    }
  }

  /**
   * Verifica si la base de datos está conectada
   */
  public isConnected(): boolean {
    return this.pool !== null;
  }
}

// Singleton de la base de datos
export const database = new Database();

/**
 * Modelo para la tabla event_signatures_cache
 * Cache de traducciones de signatures a nombres de eventos
 */

import { Pool } from 'pg';
import { pool } from '../../config/database';
import { logger } from '../../utils/logger';

export interface EventSignatureCache {
  id: number;
  signature: string;
  event_name: string;
  text_signature?: string;
  source: string;
  hit_count: number;
  first_seen_at: Date;
  last_used_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateEventSignatureCacheInput {
  signature: string;
  event_name: string;
  text_signature?: string;
  source?: string;
}

export class EventSignatureCacheModel {
  private pool: Pool;

  constructor(dbPool: Pool = pool) {
    this.pool = dbPool;
  }

  /**
   * Buscar un evento por su signature (con incremento de hit_count)
   */
  async findBySignature(signature: string): Promise<EventSignatureCache | null> {
    try {
      const result = await this.pool.query<EventSignatureCache>(
        `UPDATE event_signatures_cache 
         SET hit_count = hit_count + 1,
             last_used_at = CURRENT_TIMESTAMP
         WHERE signature = $1
         RETURNING *`,
        [signature]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error al buscar signature en cache:', error);
      return null;
    }
  }

  /**
   * Buscar un evento por su signature (sin incrementar hit_count)
   */
  async findBySignatureReadOnly(signature: string): Promise<EventSignatureCache | null> {
    try {
      const result = await this.pool.query<EventSignatureCache>(
        'SELECT * FROM event_signatures_cache WHERE signature = $1',
        [signature]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error al buscar signature en cache:', error);
      return null;
    }
  }

  /**
   * Buscar múltiples signatures de una vez
   */
  async findManyBySignatures(signatures: string[]): Promise<Map<string, EventSignatureCache>> {
    if (signatures.length === 0) return new Map();

    try {
      const result = await this.pool.query<EventSignatureCache>(
        `UPDATE event_signatures_cache 
         SET hit_count = hit_count + 1,
             last_used_at = CURRENT_TIMESTAMP
         WHERE signature = ANY($1::text[])
         RETURNING *`,
        [signatures]
      );

      const map = new Map<string, EventSignatureCache>();
      result.rows.forEach(row => {
        map.set(row.signature, row);
      });

      return map;
    } catch (error) {
      logger.error('Error al buscar múltiples signatures:', error);
      return new Map();
    }
  }

  /**
   * Crear un nuevo registro en la cache
   */
  async create(data: CreateEventSignatureCacheInput): Promise<EventSignatureCache> {
    const { signature, event_name, text_signature, source = '4byte.directory' } = data;

    const result = await this.pool.query<EventSignatureCache>(
      `INSERT INTO event_signatures_cache 
       (signature, event_name, text_signature, source)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (signature) 
       DO UPDATE SET 
         hit_count = event_signatures_cache.hit_count + 1,
         last_used_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [signature, event_name, text_signature, source]
    );

    return result.rows[0];
  }

  /**
   * Crear múltiples registros en batch
   */
  async createMany(data: CreateEventSignatureCacheInput[]): Promise<number> {
    if (data.length === 0) return 0;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      let inserted = 0;
      for (const item of data) {
        await client.query(
          `INSERT INTO event_signatures_cache 
           (signature, event_name, text_signature, source)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (signature) DO NOTHING`,
          [item.signature, item.event_name, item.text_signature, item.source || '4byte.directory']
        );
        inserted++;
      }

      await client.query('COMMIT');
      return inserted;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error al insertar múltiples signatures:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Obtener estadísticas de la cache
   */
  async getStats(): Promise<{
    total: number;
    sources: { source: string; count: number }[];
    mostUsed: EventSignatureCache[];
    recentlyAdded: EventSignatureCache[];
  }> {
    try {
      // Total de signatures
      const totalResult = await this.pool.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM event_signatures_cache'
      );
      const total = parseInt(totalResult.rows[0].count, 10);

      // Por fuente
      const sourcesResult = await this.pool.query<{ source: string; count: string }>(
        `SELECT source, COUNT(*) as count 
         FROM event_signatures_cache 
         GROUP BY source 
         ORDER BY count DESC`
      );
      const sources = sourcesResult.rows.map(row => ({
        source: row.source,
        count: parseInt(row.count, 10),
      }));

      // Más usadas
      const mostUsedResult = await this.pool.query<EventSignatureCache>(
        `SELECT * FROM event_signatures_cache 
         ORDER BY hit_count DESC 
         LIMIT 10`
      );
      const mostUsed = mostUsedResult.rows;

      // Agregadas recientemente
      const recentlyAddedResult = await this.pool.query<EventSignatureCache>(
        `SELECT * FROM event_signatures_cache 
         ORDER BY first_seen_at DESC 
         LIMIT 10`
      );
      const recentlyAdded = recentlyAddedResult.rows;

      return {
        total,
        sources,
        mostUsed,
        recentlyAdded,
      };
    } catch (error) {
      logger.error('Error al obtener estadísticas de cache:', error);
      throw error;
    }
  }

  /**
   * Limpiar signatures antiguas no usadas
   */
  async cleanupOldEntries(daysOld: number = 90, minHitCount: number = 1): Promise<number> {
    try {
      const result = await this.pool.query(
        `DELETE FROM event_signatures_cache 
         WHERE last_used_at < NOW() - INTERVAL '${daysOld} days'
         AND hit_count < $1
         RETURNING id`,
        [minHitCount]
      );

      const deleted = result.rowCount || 0;
      logger.info(`🗑️ Limpieza de cache: ${deleted} signatures eliminadas`);
      return deleted;
    } catch (error) {
      logger.error('Error al limpiar cache antigua:', error);
      throw error;
    }
  }

  /**
   * Exportar todas las signatures para backup
   */
  async exportAll(): Promise<EventSignatureCache[]> {
    try {
      const result = await this.pool.query<EventSignatureCache>(
        'SELECT * FROM event_signatures_cache ORDER BY signature'
      );
      return result.rows;
    } catch (error) {
      logger.error('Error al exportar signatures:', error);
      throw error;
    }
  }
}

// Instancia singleton
export const eventSignatureCacheModel = new EventSignatureCacheModel();


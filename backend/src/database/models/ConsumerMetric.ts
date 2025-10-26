import { database } from '../../config/database';
import { logger } from '../../utils/logger';

export interface ConsumerMetricData {
  id?: number;
  consumerId: string;
  rpcId?: number | null;
  rpcUrl?: string | null;
  status: 'processing' | 'completed' | 'failed' | 'retrying';
  blocksProcessed?: number;
  eventsExtracted?: number;
  transactionsProcessed?: number;
  errorsCount?: number;
  retryCount?: number;
  startBlock?: number | null;
  endBlock?: number | null;
  currentBlock?: number | null;
  executionTimeMs?: number | null;
  blocksPerSecond?: number | null;
  startedAt?: Date;
  finishedAt?: Date | null;
  errorMessage?: string | null;
  stackTrace?: string | null;
}

export class ConsumerMetric {
  /**
   * Crea una nueva métrica de consumidor
   */
  static async create(data: ConsumerMetricData): Promise<number> {
    const query = `
      INSERT INTO consumer_metrics (
        consumer_id, rpc_id, rpc_url, status, start_block, end_block
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;

    const values = [
      data.consumerId,
      data.rpcId || null,
      data.rpcUrl || null,
      data.status,
      data.startBlock || null,
      data.endBlock || null,
    ];

    try {
      const result = await database.query(query, values);
      const id = result.rows[0].id;
      logger.debug(`Métrica de consumidor creada: ID ${id}`);
      return id;
    } catch (error) {
      logger.error('Error creando métrica de consumidor:', error);
      throw error;
    }
  }

  /**
   * Actualiza una métrica de consumidor
   */
  static async update(id: number, data: Partial<ConsumerMetricData>): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.status !== undefined) {
      fields.push(`status = $${paramCount++}`);
      values.push(data.status);
    }

    if (data.blocksProcessed !== undefined) {
      fields.push(`blocks_processed = $${paramCount++}`);
      values.push(data.blocksProcessed);
    }

    if (data.eventsExtracted !== undefined) {
      fields.push(`events_extracted = $${paramCount++}`);
      values.push(data.eventsExtracted);
    }

    if (data.transactionsProcessed !== undefined) {
      fields.push(`transactions_processed = $${paramCount++}`);
      values.push(data.transactionsProcessed);
    }

    if (data.errorsCount !== undefined) {
      fields.push(`errors_count = $${paramCount++}`);
      values.push(data.errorsCount);
    }

    if (data.retryCount !== undefined) {
      fields.push(`retry_count = $${paramCount++}`);
      values.push(data.retryCount);
    }

    if (data.currentBlock !== undefined) {
      fields.push(`current_block = $${paramCount++}`);
      values.push(data.currentBlock);
    }

    if (data.executionTimeMs !== undefined) {
      fields.push(`execution_time_ms = $${paramCount++}`);
      values.push(data.executionTimeMs);
    }

    if (data.blocksPerSecond !== undefined) {
      fields.push(`blocks_per_second = $${paramCount++}`);
      values.push(data.blocksPerSecond);
    }

    if (data.finishedAt !== undefined) {
      fields.push(`finished_at = $${paramCount++}`);
      values.push(data.finishedAt);
    }

    if (data.errorMessage !== undefined) {
      fields.push(`error_message = $${paramCount++}`);
      values.push(data.errorMessage);
    }

    if (data.stackTrace !== undefined) {
      fields.push(`stack_trace = $${paramCount++}`);
      values.push(data.stackTrace);
    }

    if (fields.length === 0) {
      return;
    }

    values.push(id);
    const query = `
      UPDATE consumer_metrics
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
    `;

    try {
      await database.query(query, values);
    } catch (error) {
      logger.error(`Error actualizando métrica ${id}:`, error);
      throw error;
    }
  }

  /**
   * Marca una métrica como completada
   */
  static async markAsCompleted(
    id: number,
    blocksProcessed: number,
    eventsExtracted: number,
    executionTimeMs: number
  ): Promise<void> {
    const blocksPerSecond =
      executionTimeMs > 0 ? (blocksProcessed / (executionTimeMs / 1000)).toFixed(2) : 0;

    await this.update(id, {
      status: 'completed',
      blocksProcessed,
      eventsExtracted,
      executionTimeMs,
      blocksPerSecond: parseFloat(blocksPerSecond as string),
      finishedAt: new Date(),
    });

    logger.info(`Métrica ${id} completada: ${blocksProcessed} bloques, ${eventsExtracted} eventos`);
  }

  /**
   * Marca una métrica como fallida
   */
  static async markAsFailed(
    id: number,
    errorMessage: string,
    stackTrace?: string
  ): Promise<void> {
    await this.update(id, {
      status: 'failed',
      errorMessage,
      stackTrace: stackTrace || null,
      finishedAt: new Date(),
    });

    logger.error(`Métrica ${id} fallida: ${errorMessage}`);
  }

  /**
   * Obtiene métricas activas
   */
  static async getActive(): Promise<ConsumerMetricData[]> {
    const query = `
      SELECT * FROM consumer_metrics
      WHERE status = 'processing'
      ORDER BY started_at DESC
    `;

    const result = await database.query(query);
    return result.rows;
  }

  /**
   * Obtiene todas las métricas
   */
  static async getAll(limit: number = 100): Promise<ConsumerMetricData[]> {
    const query = `
      SELECT * FROM consumer_metrics
      ORDER BY started_at DESC
      LIMIT $1
    `;

    const result = await database.query(query, [limit]);
    return result.rows;
  }

  /**
   * Obtiene estadísticas globales
   */
  static async getGlobalStats(): Promise<{
    totalCompleted: number;
    totalFailed: number;
    totalProcessing: number;
    totalBlocksProcessed: number;
    totalEventsExtracted: number;
    averageExecutionTime: number;
  }> {
    const query = `
      SELECT
        COUNT(*) FILTER (WHERE status = 'completed') as total_completed,
        COUNT(*) FILTER (WHERE status = 'failed') as total_failed,
        COUNT(*) FILTER (WHERE status = 'processing') as total_processing,
        COALESCE(SUM(blocks_processed), 0) as total_blocks_processed,
        COALESCE(SUM(events_extracted), 0) as total_events_extracted,
        COALESCE(AVG(execution_time_ms), 0) as average_execution_time
      FROM consumer_metrics
    `;

    const result = await database.query(query);
    const row = result.rows[0];

    return {
      totalCompleted: parseInt(row.total_completed, 10),
      totalFailed: parseInt(row.total_failed, 10),
      totalProcessing: parseInt(row.total_processing, 10),
      totalBlocksProcessed: parseInt(row.total_blocks_processed, 10),
      totalEventsExtracted: parseInt(row.total_events_extracted, 10),
      averageExecutionTime: parseFloat(row.average_execution_time),
    };
  }
}

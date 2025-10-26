import { database } from '../../config/database';
import { logger } from '../../utils/logger';

export interface EventData {
  blockHash: string;
  transactionHash: string;
  blockNumber: number;
  transactionIndex?: number;
  logIndex?: number;
  contractAddress?: string;
  eventName?: string | null;
  eventSignature: string;
  param_1?: string | null;
  param_2?: string | null;
  param_3?: string | null;
  param_4?: string | null;
  param_5?: string | null;
  param_6?: string | null;
  param_7?: string | null;
  param_8?: string | null;
  param_9?: string | null;
  param_10?: string | null;
  param_11?: string | null;
  param_12?: string | null;
  param_13?: string | null;
  param_14?: string | null;
  param_15?: string | null;
  param_16?: string | null;
  param_17?: string | null;
  param_18?: string | null;
  param_19?: string | null;
  param_20?: string | null;
  blockTimestamp?: Date | null;
}

export class Event {
  /**
   * Inserta un evento en la base de datos
   */
  static async insert(eventData: EventData): Promise<void> {
    const query = `
      INSERT INTO events (
        block_hash, transaction_hash, block_number, transaction_index, log_index,
        contract_address, event_name, event_signature,
        param_1, param_2, param_3, param_4, param_5,
        param_6, param_7, param_8, param_9, param_10,
        param_11, param_12, param_13, param_14, param_15,
        param_16, param_17, param_18, param_19, param_20,
        block_timestamp
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28, $29
      )
    `;

    const values = [
      eventData.blockHash,
      eventData.transactionHash,
      eventData.blockNumber,
      eventData.transactionIndex || null,
      eventData.logIndex || null,
      eventData.contractAddress || null,
      eventData.eventName || null,
      eventData.eventSignature,
      eventData.param_1 || null,
      eventData.param_2 || null,
      eventData.param_3 || null,
      eventData.param_4 || null,
      eventData.param_5 || null,
      eventData.param_6 || null,
      eventData.param_7 || null,
      eventData.param_8 || null,
      eventData.param_9 || null,
      eventData.param_10 || null,
      eventData.param_11 || null,
      eventData.param_12 || null,
      eventData.param_13 || null,
      eventData.param_14 || null,
      eventData.param_15 || null,
      eventData.param_16 || null,
      eventData.param_17 || null,
      eventData.param_18 || null,
      eventData.param_19 || null,
      eventData.param_20 || null,
      eventData.blockTimestamp || null,
    ];

    try {
      await database.query(query, values);
    } catch (error) {
      logger.error('Error insertando evento:', error);
      throw error;
    }
  }

  /**
   * Inserta múltiples eventos en batch
   */
  static async insertBatch(events: EventData[]): Promise<number> {
    if (events.length === 0) {
      return 0;
    }

    const client = await database.getClient();

    try {
      await client.query('BEGIN');

      let inserted = 0;
      for (const eventData of events) {
        const query = `
          INSERT INTO events (
            block_hash, transaction_hash, block_number, transaction_index, log_index,
            contract_address, event_name, event_signature,
            param_1, param_2, param_3, param_4, param_5,
            param_6, param_7, param_8, param_9, param_10,
            param_11, param_12, param_13, param_14, param_15,
            param_16, param_17, param_18, param_19, param_20,
            block_timestamp
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
            $21, $22, $23, $24, $25, $26, $27, $28, $29
          )
        `;

        const values = [
          eventData.blockHash,
          eventData.transactionHash,
          eventData.blockNumber,
          eventData.transactionIndex || null,
          eventData.logIndex || null,
          eventData.contractAddress || null,
          eventData.eventName || null,
          eventData.eventSignature,
          eventData.param_1 || null,
          eventData.param_2 || null,
          eventData.param_3 || null,
          eventData.param_4 || null,
          eventData.param_5 || null,
          eventData.param_6 || null,
          eventData.param_7 || null,
          eventData.param_8 || null,
          eventData.param_9 || null,
          eventData.param_10 || null,
          eventData.param_11 || null,
          eventData.param_12 || null,
          eventData.param_13 || null,
          eventData.param_14 || null,
          eventData.param_15 || null,
          eventData.param_16 || null,
          eventData.param_17 || null,
          eventData.param_18 || null,
          eventData.param_19 || null,
          eventData.param_20 || null,
          eventData.blockTimestamp || null,
        ];

        await client.query(query, values);
        inserted++;
      }

      await client.query('COMMIT');
      return inserted;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error insertando eventos en batch:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Cuenta eventos por rango de bloques
   */
  static async countByBlockRange(
    startBlock: number,
    endBlock: number
  ): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM events
      WHERE block_number >= $1 AND block_number <= $2
    `;

    const result = await database.query(query, [startBlock, endBlock]);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Obtiene eventos por bloque
   */
  static async getByBlockNumber(blockNumber: number): Promise<EventData[]> {
    const query = 'SELECT * FROM events WHERE block_number = $1 ORDER BY log_index';
    const result = await database.query(query, [blockNumber]);
    return result.rows;
  }
}

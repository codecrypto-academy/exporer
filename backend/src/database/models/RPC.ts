import { database } from '../../config/database';
import { logger } from '../../utils/logger';

export interface RPCData {
  id?: number;
  name: string;
  url: string;
  last_block?: number | null;
  last_update?: Date | null;
  active: boolean;
  tested: boolean;
  execution_time?: string | null;
  registros?: number | null;
  error?: string | null;
  in_use?: boolean;
  consumer_id?: string | null;
}

export class RPC {
  /**
   * Inserta o actualiza un RPC en la base de datos
   */
  static async upsert(rpcData: RPCData): Promise<void> {
    const query = `
      INSERT INTO rpcs (name, url, last_block, last_update, active, tested, execution_time, registros, error)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (url)
      DO UPDATE SET
        name = EXCLUDED.name,
        last_block = EXCLUDED.last_block,
        last_update = EXCLUDED.last_update,
        active = EXCLUDED.active,
        tested = EXCLUDED.tested,
        execution_time = EXCLUDED.execution_time,
        registros = EXCLUDED.registros,
        error = EXCLUDED.error,
        updated_at = CURRENT_TIMESTAMP
    `;

    const values = [
      rpcData.name,
      rpcData.url,
      rpcData.last_block || null,
      rpcData.last_update ? new Date(rpcData.last_update) : null,
      rpcData.active,
      rpcData.tested,
      rpcData.execution_time || null,
      rpcData.registros || null,
      rpcData.error || null,
    ];

    try {
      await database.query(query, values);
      logger.debug(`RPC upserted: ${rpcData.name}`);
    } catch (error) {
      logger.error(`Error upserting RPC ${rpcData.name}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene todos los RPCs activos
   */
  static async getActive(): Promise<RPCData[]> {
    const query = 'SELECT * FROM rpcs WHERE active = true ORDER BY name';
    const result = await database.query(query);
    return result.rows;
  }

  /**
   * Obtiene un RPC disponible (activo y no en uso)
   */
  static async getAvailable(): Promise<RPCData | null> {
    const query = `
      SELECT * FROM rpcs
      WHERE active = true AND (in_use = false OR in_use IS NULL)
      ORDER BY RANDOM()
      LIMIT 1
    `;
    const result = await database.query(query);
    return result.rows[0] || null;
  }

  /**
   * Marca un RPC como en uso por un consumidor
   */
  static async markAsUsed(rpcId: number, consumerId: string): Promise<void> {
    const query = `
      UPDATE rpcs
      SET in_use = true, consumer_id = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;
    await database.query(query, [consumerId, rpcId]);
    logger.debug(`RPC ${rpcId} marcado como en uso por ${consumerId}`);
  }

  /**
   * Libera un RPC (marca como no en uso)
   */
  static async release(rpcId: number): Promise<void> {
    const query = `
      UPDATE rpcs
      SET in_use = false, consumer_id = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    await database.query(query, [rpcId]);
    logger.debug(`RPC ${rpcId} liberado`);
  }

  /**
   * Cuenta el total de RPCs activos
   */
  static async countActive(): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM rpcs WHERE active = true';
    const result = await database.query(query);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Obtiene todos los RPCs
   */
  static async getAll(): Promise<RPCData[]> {
    const query = 'SELECT * FROM rpcs ORDER BY name';
    const result = await database.query(query);
    return result.rows;
  }

  /**
   * Actualiza el estado de un RPC
   */
  static async updateStatus(rpcId: number, active: boolean): Promise<void> {
    const query = `
      UPDATE rpcs
      SET active = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;
    await database.query(query, [active, rpcId]);
    logger.info(`RPC ${rpcId} estado actualizado a: ${active ? 'activo' : 'inactivo'}`);
  }
}

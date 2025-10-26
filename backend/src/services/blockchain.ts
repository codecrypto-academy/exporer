import { ethers, JsonRpcProvider, Block, Log, TransactionReceipt } from 'ethers';
import { logger } from '../utils/logger';

export class BlockchainService {
  private provider: JsonRpcProvider;
  private rpcUrl: string;

  constructor(rpcUrl: string) {
    this.rpcUrl = rpcUrl;
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
  }

  /**
   * Obtiene un bloque por número
   */
  public async getBlock(blockNumber: number): Promise<Block | null> {
    try {
      const block = await this.provider.getBlock(blockNumber);
      return block;
    } catch (error) {
      logger.error(`Error obteniendo bloque ${blockNumber} desde ${this.rpcUrl}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene múltiples bloques en un rango
   */
  public async getBlockRange(
    startBlock: number,
    endBlock: number
  ): Promise<(Block | null)[]> {
    const blocks: (Block | null)[] = [];

    for (let blockNum = startBlock; blockNum <= endBlock; blockNum++) {
      try {
        const block = await this.getBlock(blockNum);
        blocks.push(block);
      } catch (error) {
        logger.error(`Error en bloque ${blockNum}:`, error);
        blocks.push(null);
      }
    }

    return blocks;
  }

  /**
   * Obtiene los logs (eventos) de un rango de bloques
   */
  public async getLogs(startBlock: number, endBlock: number): Promise<Log[]> {
    try {
      const logs = await this.provider.getLogs({
        fromBlock: startBlock,
        toBlock: endBlock,
      });

      logger.debug(
        `Obtenidos ${logs.length} logs de bloques ${startBlock}-${endBlock}`
      );

      return logs;
    } catch (error) {
      logger.error(
        `Error obteniendo logs de bloques ${startBlock}-${endBlock}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Obtiene el recibo de una transacción
   */
  public async getTransactionReceipt(
    txHash: string
  ): Promise<TransactionReceipt | null> {
    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);
      return receipt;
    } catch (error) {
      logger.error(`Error obteniendo recibo de transacción ${txHash}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene el número del último bloque
   */
  public async getLatestBlockNumber(): Promise<number> {
    try {
      const blockNumber = await this.provider.getBlockNumber();
      return blockNumber;
    } catch (error) {
      logger.error('Error obteniendo último bloque:', error);
      throw error;
    }
  }

  /**
   * Verifica la conexión con el RPC
   */
  public async testConnection(): Promise<boolean> {
    try {
      await this.provider.getBlockNumber();
      return true;
    } catch (error) {
      logger.error(`Error probando conexión a ${this.rpcUrl}:`, error);
      return false;
    }
  }

  /**
   * Procesa los logs y extrae información de eventos
   */
  public async processLogs(logs: Log[]): Promise<ProcessedEvent[]> {
    const processedEvents: ProcessedEvent[] = [];

    for (const log of logs) {
      try {
        const event: ProcessedEvent = {
          blockHash: log.blockHash,
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash,
          transactionIndex: log.transactionIndex,
          logIndex: log.index,
          contractAddress: log.address,
          eventSignature: log.topics[0] || '',
          topics: log.topics,
          data: log.data,
        };

        processedEvents.push(event);
      } catch (error) {
        logger.error('Error procesando log:', error);
      }
    }

    return processedEvents;
  }

  /**
   * Cierra el provider
   */
  public async destroy(): Promise<void> {
    try {
      await this.provider.destroy();
      logger.debug(`Provider ${this.rpcUrl} destruido`);
    } catch (error) {
      logger.error('Error destruyendo provider:', error);
    }
  }
}

export interface ProcessedEvent {
  blockHash: string;
  blockNumber: number;
  transactionHash: string;
  transactionIndex: number;
  logIndex: number;
  contractAddress: string;
  eventSignature: string;
  topics: string[];
  data: string;
}

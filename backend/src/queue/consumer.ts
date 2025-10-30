import { v4 as uuidv4 } from 'uuid';
import { activemq } from '../config/activemq';
import { database } from '../config/database';
import { RPC } from '../database/models/RPC';
import { Event, EventData } from '../database/models/Event';
import { ConsumerMetric } from '../database/models/ConsumerMetric';
import { BlockchainService, ProcessedEvent } from '../services/blockchain';
import { EventDecoder } from '../services/decoder';
import { logger } from '../utils/logger';
import { config } from '../config/environment';
import { BlockRangeMessage } from './producer';

export class BlockConsumer {
  private consumerId: string;
  private rpc: any = null;
  private blockchainService: BlockchainService | null = null;
  private decoder: EventDecoder;
  private isRunning: boolean = false;

  constructor() {
    this.consumerId = `consumer-${uuidv4()}`;
    this.decoder = new EventDecoder();
  }

  /**
   * Inicia el consumidor
   */
  public async start(): Promise<void> {
    try {
      logger.info(`🚀 Iniciando consumidor: ${this.consumerId}`);

      // Conectar a base de datos y ActiveMQ
      await database.connect();
      await activemq.connect();

      this.isRunning = true;

      // Comenzar a consumir mensajes
      await activemq.consume(
        config.activemq.queues.blocks,
        this.processMessage.bind(this)
      );

      logger.info(`✅ Consumidor ${this.consumerId} iniciado y escuchando mensajes`);
    } catch (error) {
      logger.error(`❌ Error iniciando consumidor ${this.consumerId}:`, error);
      throw error;
    }
  }

  /**
   * Procesa un mensaje de la cola
   */
  private async processMessage(message: BlockRangeMessage): Promise<void> {
    const startTime = Date.now();
    let metricId: number | null = null;

    try {
      logger.info(
        `📨 ${this.consumerId} procesando bloques ${message.startBlock}-${message.endBlock}`
      );

      // 1. Asignar un RPC exclusivo
      this.rpc = await this.assignExclusiveRPC();

      if (!this.rpc) {
        throw new Error('No hay RPCs disponibles');
      }

      // 2. Crear métrica de consumidor
      metricId = await ConsumerMetric.create({
        consumerId: this.consumerId,
        rpcId: this.rpc.id,
        rpcUrl: this.rpc.url,
        status: 'processing',
        startBlock: message.startBlock,
        endBlock: message.endBlock,
      });

      // 3. Inicializar servicio de blockchain
      this.blockchainService = new BlockchainService(this.rpc.url);

      // Verificar conexión
      const isConnected = await this.blockchainService.testConnection();
      if (!isConnected) {
        throw new Error(`No se pudo conectar al RPC: ${this.rpc.url}`);
      }

      // 4. Obtener logs del rango de bloques
      logger.info(`🔍 Obteniendo logs de bloques ${message.startBlock}-${message.endBlock}`);
      const logs = await this.blockchainService.getLogs(
        message.startBlock,
        message.endBlock
      );

      logger.info(`📊 ${logs.length} logs encontrados`);

      // 5. Procesar logs
      const processedEvents = await this.blockchainService.processLogs(logs);

      // 6. Decodificar eventos
      logger.info(`🔓 Decodificando ${processedEvents.length} eventos...`);
      const decodedEvents = await this.decodeEvents(processedEvents);

      // 7. Guardar eventos en base de datos
      logger.info(`💾 Guardando ${decodedEvents.length} eventos en BD...`);
      const inserted = await Event.insertBatch(decodedEvents);

      // 8. Calcular métricas
      const executionTime = Date.now() - startTime;
      const blocksProcessed = message.endBlock - message.startBlock + 1;

      // 9. Actualizar métrica como completada
      if (metricId) {
        await ConsumerMetric.markAsCompleted(
          metricId,
          blocksProcessed,
          inserted,
          executionTime
        );
      }

      logger.info(
        `✅ ${this.consumerId} completó bloques ${message.startBlock}-${message.endBlock} ` +
          `(${inserted} eventos, ${(executionTime / 1000).toFixed(2)}s)`
      );
    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error(
        `❌ Error procesando bloques ${message.startBlock}-${message.endBlock}:`,
        error
      );

      // Marcar métrica como fallida
      if (metricId) {
        await ConsumerMetric.markAsFailed(
          metricId,
          (error as Error).message,
          (error as Error).stack
        );
      }

      // Re-throw para que RabbitMQ reintente
      throw error;
    } finally {
      // Liberar RPC
      if (this.rpc) {
        await RPC.release(this.rpc.id);
        this.rpc = null;
      }

      // Destruir servicio de blockchain
      if (this.blockchainService) {
        await this.blockchainService.destroy();
        this.blockchainService = null;
      }
    }
  }

  /**
   * Asigna un RPC exclusivo al consumidor
   */
  private async assignExclusiveRPC(): Promise<any> {
    const maxRetries = 10;
    let retries = 0;

    while (retries < maxRetries) {
      const availableRPC = await RPC.getAvailable();

      if (availableRPC) {
        // Marcar como en uso
        await RPC.markAsUsed(availableRPC.id!, this.consumerId);
        logger.info(`🔗 ${this.consumerId} usando RPC: ${availableRPC.name} (${availableRPC.url})`);
        return availableRPC;
      }

      // Esperar y reintentar
      logger.warn(`⏳ No hay RPCs disponibles. Reintentando en 2s... (${retries + 1}/${maxRetries})`);
      await this.delay(2000);
      retries++;
    }

    throw new Error('No se pudo asignar un RPC después de múltiples intentos');
  }

  /**
   * Decodifica eventos y prepara para inserción en BD
   */
  private async decodeEvents(processedEvents: ProcessedEvent[]): Promise<EventData[]> {
    const decodedEvents: EventData[] = [];

    for (const event of processedEvents) {
      try {
        // Decodificar signature
        const eventName = await this.decoder.decodeEventSignature(event.eventSignature);

        // Extraer parámetros
        const params = this.decoder.extractParameters(event.data, event.topics);

        // Crear objeto de evento
        const eventData: EventData = {
          blockHash: event.blockHash,
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
          transactionIndex: event.transactionIndex,
          logIndex: event.logIndex,
          contractAddress: event.contractAddress,
          eventName: eventName,
          eventSignature: event.eventSignature,
        };

        // Asignar parámetros (máximo 20)
        for (let i = 0; i < Math.min(params.length, 20); i++) {
          (eventData as any)[`param_${i + 1}`] = params[i];
        }

        decodedEvents.push(eventData);
      } catch (error) {
        logger.error('Error decodificando evento:', error);
        // Continuar con el siguiente evento
      }
    }

    return decodedEvents;
  }

  /**
   * Detiene el consumidor
   */
  public async stop(): Promise<void> {
    logger.info(`🛑 Deteniendo consumidor: ${this.consumerId}`);
    this.isRunning = false;

    // Liberar RPC si está asignado
    if (this.rpc) {
      await RPC.release(this.rpc.id);
    }

    // Destruir servicio de blockchain
    if (this.blockchainService) {
      await this.blockchainService.destroy();
    }

    await activemq.disconnect();
    await database.disconnect();

    logger.info(`👋 Consumidor ${this.consumerId} detenido`);
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Obtiene el ID del consumidor
   */
  public getConsumerId(): string {
    return this.consumerId;
  }

  /**
   * Verifica si está corriendo
   */
  public isActive(): boolean {
    return this.isRunning;
  }
}

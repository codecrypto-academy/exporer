import { rabbitmq } from '../config/rabbitmq';
import { config } from '../config/environment';
import { logger } from '../utils/logger';

export interface BlockRangeMessage {
  startBlock: number;
  endBlock: number;
  taskCode: string;
  createdAt: Date;
  retryCount?: number;
}

export class BlockProducer {
  /**
   * Genera mensajes con rangos de bloques y los envía a la cola
   */
  public async produceBlockRanges(): Promise<void> {
    try {
      logger.info('🚀 Iniciando productor de bloques...');

      // Conectar a RabbitMQ
      await rabbitmq.connect();

      const { startBlock, endBlock, blocksPerMessage } = config.ethereum;
      console.log('startBlock', startBlock);
      console.log('endBlock', endBlock);
      console.log('blocksPerMessage', blocksPerMessage);
      if (startBlock >= endBlock) {
        throw new Error(
          `Rango de bloques inválido: start=${startBlock}, end=${endBlock}`
        );
      }

      const totalBlocks = endBlock - startBlock;
      const totalMessages = Math.ceil(totalBlocks / blocksPerMessage);

      logger.info(`📊 Configuración de procesamiento:`);
      logger.info(`   Bloque inicial: ${startBlock.toLocaleString()}`);
      logger.info(`   Bloque final: ${endBlock.toLocaleString()}`);
      logger.info(`   Total de bloques: ${totalBlocks.toLocaleString()}`);
      logger.info(`   Bloques por mensaje: ${blocksPerMessage}`);
      logger.info(`   Total de mensajes a generar: ${totalMessages.toLocaleString()}`);

      let messagesSent = 0;
      let currentBlock = startBlock;

      while (currentBlock < endBlock) {
        const rangeEnd = Math.min(currentBlock + blocksPerMessage - 1, endBlock - 1);

        const message: BlockRangeMessage = {
          startBlock: currentBlock,
          endBlock: rangeEnd,
          taskCode: 'PROCESS_EVENTS', // Código de tarea
          createdAt: new Date(),
          retryCount: 0,
        };

        // Enviar mensaje a la cola
        await rabbitmq.publish(config.rabbitmq.queues.blocks, message);

        messagesSent++;
        currentBlock = rangeEnd + 1;

        // Log de progreso cada 100 mensajes
        if (messagesSent % 100 === 0) {
          logger.info(
            `📤 Enviados ${messagesSent.toLocaleString()}/${totalMessages.toLocaleString()} mensajes (${Math.round(
              (messagesSent / totalMessages) * 100
            )}%)`
          );
        }
      }

      logger.info(
        `\n✅ Todos los mensajes enviados exitosamente: ${messagesSent.toLocaleString()}`
      );

      // Verificar cola
      const queueCount = await rabbitmq.getQueueMessageCount(
        config.rabbitmq.queues.blocks
      );
      logger.info(`📬 Mensajes en cola: ${queueCount.toLocaleString()}`);

      logger.info('\n🎉 Productor finalizado exitosamente!');
    } catch (error) {
      logger.error('❌ Error en el productor:', error);
      throw error;
    }
  }

  /**
   * Envía un único mensaje de rango de bloques
   */
  public async produceBlockRange(
    startBlock: number,
    endBlock: number,
    taskCode: string = 'PROCESS_EVENTS'
  ): Promise<void> {
    const message: BlockRangeMessage = {
      startBlock,
      endBlock,
      taskCode,
      createdAt: new Date(),
      retryCount: 0,
    };

    await rabbitmq.publish(config.rabbitmq.queues.blocks, message);
    logger.info(`📤 Mensaje enviado: bloques ${startBlock} - ${endBlock}`);
  }

  /**
   * Obtiene estadísticas de la cola
   */
  public async getQueueStats(): Promise<{
    blocksQueue: number;
    retriesQueue: number;
    deadLetterQueue: number;
  }> {
    return {
      blocksQueue: await rabbitmq.getQueueMessageCount(config.rabbitmq.queues.blocks),
      retriesQueue: await rabbitmq.getQueueMessageCount(config.rabbitmq.queues.retries),
      deadLetterQueue: await rabbitmq.getQueueMessageCount(
        config.rabbitmq.queues.deadLetter
      ),
    };
  }
}

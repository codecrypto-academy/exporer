import amqp from 'amqplib';
import { config } from './environment';
import { logger } from '../utils/logger';

class RabbitMQ {
  private connection: amqp.ChannelModel | undefined;
  private channel: amqp.Channel | undefined;

  /**
   * Conecta a RabbitMQ y crea el canal
   */
  public async connect(): Promise<void> {
    try {
      const conn = await amqp.connect(config.rabbitmq.url);
      this.connection = conn;
      
      const ch = await conn.createChannel();
      this.channel = ch;

      // Configurar colas
      await this.setupQueues();

      // Manejar eventos de conexión
      conn.on('error', (err) => {
        logger.error('RabbitMQ connection error:', err);
      });

      conn.on('close', () => {
        logger.warn('RabbitMQ connection closed. Reconnecting...');
        setTimeout(() => this.connect(), 5000);
      });

      logger.info('✅ Conexión a RabbitMQ establecida correctamente');
    } catch (error) {
      logger.error('❌ Error al conectar a RabbitMQ:', error);
      throw error;
    }
  }

  /**
   * Configura las colas necesarias
   */
  private async setupQueues(): Promise<void> {
    if (!this.channel) {
      throw new Error('Canal de RabbitMQ no está inicializado');
    }

    // Cola principal de bloques
    await this.channel.assertQueue(config.rabbitmq.queues.blocks, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': '',
        'x-dead-letter-routing-key': config.rabbitmq.queues.deadLetter,
      },
    });

    // Cola de reintentos
    await this.channel.assertQueue(config.rabbitmq.queues.retries, {
      durable: true,
      arguments: {
        'x-message-ttl': config.worker.retryDelay, // Tiempo antes de reenviar
        'x-dead-letter-exchange': '',
        'x-dead-letter-routing-key': config.rabbitmq.queues.blocks,
      },
    });

    // Cola de mensajes muertos (dead letter)
    await this.channel.assertQueue(config.rabbitmq.queues.deadLetter, {
      durable: true,
    });

    logger.info('📬 Colas de RabbitMQ configuradas correctamente');
  }

  /**
   * Publica un mensaje en una cola
   */
  public async publish(queue: string, message: any): Promise<boolean> {
    if (!this.channel) {
      throw new Error('Canal de RabbitMQ no está inicializado');
    }

    try {
      const buffer = Buffer.from(JSON.stringify(message));
      const sent = this.channel.sendToQueue(queue, buffer, {
        persistent: true,
        contentType: 'application/json',
      });

      if (!sent) {
        logger.warn(`Canal lleno. Esperando para enviar mensaje a ${queue}`);
        await new Promise((resolve) => this.channel!.once('drain', resolve));
      }

      return true;
    } catch (error) {
      logger.error(`Error publicando mensaje en ${queue}:`, error);
      throw error;
    }
  }

  /**
   * Consume mensajes de una cola
   */
  public async consume(
    queue: string,
    onMessage: (message: any) => Promise<void>
  ): Promise<void> {
    if (!this.channel) {
      throw new Error('Canal de RabbitMQ no está inicializado');
    }

    await this.channel.prefetch(1); // Procesar un mensaje a la vez

    this.channel.consume(
      queue,
      async (msg) => {
        if (!msg) {
          return;
        }

        try {
          const content = JSON.parse(msg.content.toString());
          logger.debug(`Mensaje recibido de ${queue}:`, content);

          await onMessage(content);

          // Acknowledge (confirmar) el mensaje
          this.channel!.ack(msg);
        } catch (error) {
          logger.error('Error procesando mensaje:', error);

          // Rechazar el mensaje y enviarlo a la cola de reintentos
          this.channel!.nack(msg, false, false);

          // Reenviar a la cola de reintentos
          await this.publish(config.rabbitmq.queues.retries, {
            ...JSON.parse(msg.content.toString()),
            retryCount: (JSON.parse(msg.content.toString()).retryCount || 0) + 1,
          });
        }
      },
      {
        noAck: false,
      }
    );

    logger.info(`🎧 Consumiendo mensajes de la cola: ${queue}`);
  }

  /**
   * Obtiene el número de mensajes en una cola
   */
  public async getQueueMessageCount(queue: string): Promise<number> {
    if (!this.channel) {
      throw new Error('Canal de RabbitMQ no está inicializado');
    }

    const queueInfo = await this.channel.checkQueue(queue);
    return queueInfo.messageCount;
  }

  /**
   * Purga una cola (elimina todos los mensajes)
   */
  public async purgeQueue(queue: string): Promise<void> {
    if (!this.channel) {
      throw new Error('Canal de RabbitMQ no está inicializado');
    }

    await this.channel.purgeQueue(queue);
    logger.info(`🗑️  Cola ${queue} purgada`);
  }

  /**
   * Cierra la conexión a RabbitMQ
   */
  public async disconnect(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = undefined;
      }

      if (this.connection) {
        await this.connection.close();
        this.connection = undefined;
      }

      logger.info('🔌 Conexión a RabbitMQ cerrada');
    } catch (error) {
      logger.error('Error al cerrar conexión de RabbitMQ:', error);
    }
  }

  /**
   * Obtiene el canal actual
   */
  public getChannel(): amqp.Channel {
    if (!this.channel) {
      throw new Error('Canal de RabbitMQ no está inicializado');
    }
    return this.channel;
  }

  /**
   * Verifica si está conectado
   */
  public isConnected(): boolean {
    return this.connection !== undefined && this.channel !== undefined;
  }
}

// Singleton de RabbitMQ
export const rabbitmq = new RabbitMQ();

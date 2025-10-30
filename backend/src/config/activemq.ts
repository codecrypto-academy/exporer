import * as Stomp from 'stompjs';
import { config } from './environment';
import { logger } from '../utils/logger';

interface ActiveMQMessage {
  body: string;
  headers: { [key: string]: string };
}

class ActiveMQ {
  private client: Stomp.Client | null = null;
  private isConnected: boolean = false;
  private subscriptions: Map<string, Stomp.Subscription> = new Map();

  /**
   * Conecta a ActiveMQ usando STOMP
   */
  public async connect(): Promise<void> {
    try {
      // Crear cliente STOMP
      this.client = Stomp.client(config.activemq.url);
      
      // Configurar credenciales
      this.client.heartbeat.outgoing = 20000;
      this.client.heartbeat.incoming = 20000;
      this.client.debug = (str) => {
        if (config.nodeEnv === 'development') {
          logger.debug('STOMP Debug:', str);
        }
      };

      // Conectar
      await new Promise<void>((resolve, reject) => {
        this.client!.connect(
          config.activemq.username,
          config.activemq.password,
          () => {
            this.isConnected = true;
            logger.info('✅ Conexión a ActiveMQ establecida correctamente');
            resolve();
          },
          (error) => {
            logger.error('❌ Error al conectar a ActiveMQ:', error);
            reject(error);
          }
        );
      });

      // Configurar colas
      await this.setupQueues();

    } catch (error) {
      logger.error('❌ Error al conectar a ActiveMQ:', error);
      throw error;
    }
  }

  /**
   * Configura las colas necesarias
   */
  private async setupQueues(): Promise<void> {
    if (!this.client || !this.isConnected) {
      throw new Error('Cliente de ActiveMQ no está conectado');
    }

    try {
      // En ActiveMQ Artemis, las colas se crean automáticamente cuando se envía el primer mensaje
      // Solo necesitamos asegurarnos de que las colas existan
      logger.info('📬 Colas de ActiveMQ configuradas correctamente');
    } catch (error) {
      logger.error('Error configurando colas de ActiveMQ:', error);
      throw error;
    }
  }

  /**
   * Publica un mensaje en una cola
   */
  public async publish(queue: string, message: any): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      throw new Error('Cliente de ActiveMQ no está conectado');
    }

    try {
      const messageBody = JSON.stringify(message);
      const headers: { [key: string]: string } = {
        'content-type': 'application/json',
        'persistent': 'true',
        'timestamp': Date.now().toString(),
      };

      // Enviar mensaje
      this.client.send(queue, headers, messageBody);
      
      logger.debug(`Mensaje enviado a ${queue}:`, message);
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
    if (!this.client || !this.isConnected) {
      throw new Error('Cliente de ActiveMQ no está conectado');
    }

    try {
      const subscription = this.client.subscribe(queue, async (frame) => {
        try {
          const message = JSON.parse(frame.body);
          logger.debug(`Mensaje recibido de ${queue}:`, message);

          await onMessage(message);

          // Acknowledge (confirmar) el mensaje
          this.client!.ack(frame);
        } catch (error) {
          logger.error('Error procesando mensaje:', error);

          // Rechazar el mensaje y enviarlo a la cola de reintentos
          this.client!.nack(frame);

          // Reenviar a la cola de reintentos
          const retryMessage = {
            ...JSON.parse(frame.body),
            retryCount: (JSON.parse(frame.body).retryCount || 0) + 1,
          };
          
          await this.publish(config.activemq.queues.retries, retryMessage);
        }
      });

      // Guardar suscripción para poder cancelarla después
      this.subscriptions.set(queue, subscription);

      logger.info(`🎧 Consumiendo mensajes de la cola: ${queue}`);
    } catch (error) {
      logger.error(`Error suscribiéndose a ${queue}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene el número de mensajes en una cola
   * Nota: ActiveMQ Artemis no expone fácilmente el conteo de mensajes via STOMP
   * Esta implementación es una aproximación
   */
  public async getQueueMessageCount(queue: string): Promise<number> {
    // ActiveMQ Artemis no proporciona conteo de mensajes directamente via STOMP
    // En un entorno de producción, esto se podría obtener via JMX o API REST
    logger.warn('getQueueMessageCount no está completamente implementado para ActiveMQ via STOMP');
    return 0;
  }

  /**
   * Purga una cola (elimina todos los mensajes)
   * Nota: ActiveMQ Artemis no soporta purga de colas via STOMP directamente
   */
  public async purgeQueue(queue: string): Promise<void> {
    logger.warn('purgeQueue no está implementado para ActiveMQ via STOMP');
    // En un entorno de producción, esto se podría hacer via JMX o API REST
  }

  /**
   * Cierra la conexión a ActiveMQ
   */
  public async disconnect(): Promise<void> {
    try {
      // Cancelar todas las suscripciones
      for (const [queue, subscription] of this.subscriptions) {
        subscription.unsubscribe();
        logger.debug(`Suscripción cancelada para ${queue}`);
      }
      this.subscriptions.clear();

      // Desconectar cliente
      if (this.client && this.isConnected) {
        this.client.disconnect(() => {
          logger.info('🔌 Conexión a ActiveMQ cerrada');
        });
        this.client = null;
        this.isConnected = false;
      }
    } catch (error) {
      logger.error('Error al cerrar conexión de ActiveMQ:', error);
    }
  }

  /**
   * Obtiene el cliente actual
   */
  public getClient(): Stomp.Client {
    if (!this.client) {
      throw new Error('Cliente de ActiveMQ no está inicializado');
    }
    return this.client;
  }

  /**
   * Verifica si está conectado
   */
  public isActiveMQConnected(): boolean {
    return this.isConnected && this.client !== null;
  }

  /**
   * Reintenta conexión si se pierde
   */
  public async reconnect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    logger.info('🔄 Reintentando conexión a ActiveMQ...');
    await this.connect();
  }
}

// Singleton de ActiveMQ
export const activemq = new ActiveMQ();


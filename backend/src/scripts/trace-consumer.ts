#!/usr/bin/env ts-node

import { rabbitmq } from '../config/rabbitmq';
import { config } from '../config/environment';
import { logger } from '../utils/logger';

let messageCount = 0;

async function main() {
  logger.info('🔍 TRACE CONSUMER - Monitor de Mensajes');
  logger.info('═══════════════════════════════════════════════════\n');

  try {
    // Conectar a RabbitMQ
    logger.info('🔌 Conectando a RabbitMQ...');
    await rabbitmq.connect();

    logger.info('✅ Conectado a RabbitMQ');
    logger.info(`📬 Escuchando cola: ${config.rabbitmq.queues.blocks}`);
    logger.info('🎧 Esperando mensajes... (Ctrl+C para salir)\n');

    // Consumir mensajes
    await rabbitmq.consume(config.rabbitmq.queues.blocks, async (message) => {
      messageCount++;
      
      const timestamp = new Date().toISOString();
      
      logger.info('═══════════════════════════════════════════════════');
      logger.info(`📨 MENSAJE #${messageCount} - ${timestamp}`);
      logger.info('═══════════════════════════════════════════════════');
      logger.info(JSON.stringify(message, null, 2));
      logger.info('═══════════════════════════════════════════════════\n');
    });

    // Mantener el proceso vivo
    await new Promise(() => {});

  } catch (error) {
    logger.error('❌ Error en trace consumer:', error);
    process.exit(1);
  }
}

// Manejar señales de terminación
process.on('SIGINT', async () => {
  logger.info('\n\n🛑 Deteniendo trace consumer...');
  logger.info(`📊 Total de mensajes recibidos: ${messageCount}`);
  await rabbitmq.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('\n\n🛑 Deteniendo trace consumer...');
  logger.info(`📊 Total de mensajes recibidos: ${messageCount}`);
  await rabbitmq.disconnect();
  process.exit(0);
});

// Ejecutar
if (require.main === module) {
  main().catch((error) => {
    logger.error('Error no controlado:', error);
    process.exit(1);
  });
}

export { main };


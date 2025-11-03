#!/usr/bin/env ts-node

import { BlockProducer } from '../queue/producer';
import { rabbitmq } from '../config/rabbitmq';
import { logger } from '../utils/logger';

async function main() {
  logger.info('═══════════════════════════════════════════════════');
  logger.info('   ETHEREUM BLOCK PROCESSOR - PRODUCTOR');
  logger.info('═══════════════════════════════════════════════════\n');

  const producer = new BlockProducer();
 
  try {
    await producer.produceBlockRanges();

    // Mostrar estadísticas final
    const stats = await producer.getQueueStats();
    logger.info('\n📊 ESTADÍSTICAS DE COLAS:');
    logger.info(`   Cola principal: ${stats.blocksQueue.toLocaleString()} mensajes`);
    logger.info(`   Cola de reintentos: ${stats.retriesQueue} mensajes`);
    logger.info(`   Cola dead-letter: ${stats.deadLetterQueue} mensajes`);

    logger.info('\n✅ Productor completado exitosamente');
  } catch (error) {
    logger.error('\n❌ Error fatal en el productor:', error);
    process.exit(1);
  } finally {
    await rabbitmq.disconnect();
    logger.info('\n👋 Desconectado de RabbitMQ');
    process.exit(0);
  }
}

// Ejecutar
if (require.main === module) {
  main().catch((error) => {
    logger.error('Error no controlado:', error);
    process.exit(1);
  });
}

export { main };

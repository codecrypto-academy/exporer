#!/usr/bin/env ts-node

import { BlockConsumer } from '../queue/consumer';
import { logger } from '../utils/logger';

async function main() {
  logger.info('═══════════════════════════════════════════════════');
  logger.info('   ETHEREUM BLOCK PROCESSOR - CONSUMIDOR');
  logger.info('═══════════════════════════════════════════════════\n');

  const consumer = new BlockConsumer();

  // Manejar señales de terminación
  process.on('SIGINT', async () => {
    logger.info('\n⚠️  Señal SIGINT recibida. Deteniendo consumidor...');
    await consumer.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('\n⚠️  Señal SIGTERM recibida. Deteniendo consumidor...');
    await consumer.stop();
    process.exit(0);
  });

  // Manejar errores no capturados
  process.on('uncaughtException', async (error) => {
    logger.error('❌ Excepción no capturada:', error);
    await consumer.stop();
    process.exit(1);
  });

  process.on('unhandledRejection', async (reason, _promise) => {
    logger.error('❌ Promesa rechazada no manejada:', reason);
    await consumer.stop();
    process.exit(1);
  });

  try {
    // Iniciar consumidor
    await consumer.start();

    logger.info(`\n✅ Consumidor ${consumer.getConsumerId()} iniciado correctamente`);
    logger.info('   Esperando mensajes... (Ctrl+C para detener)\n');

    // Mantener el proceso vivo
    await new Promise(() => {}); // Espera infinita
  } catch (error) {
    logger.error('\n❌ Error fatal en el consumidor:', error);
    process.exit(1);
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

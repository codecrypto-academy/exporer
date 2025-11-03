import { database } from './config/database';
import { rabbitmq } from './config/rabbitmq';
import { logger } from './utils/logger';
import { config, validateConfig } from './config/environment';

async function main() {
  logger.info('═══════════════════════════════════════════════════');
  logger.info('   ETHEREUM BLOCK PROCESSOR - BACKEND');
  logger.info('═══════════════════════════════════════════════════\n');

  try {
    // Validar configuración
    validateConfig();
    logger.info('✅ Configuración validada');

    // Conectar a base de datos
    await database.connect();

    // Conectar a RabbitMQ
    await rabbitmq.connect();

    logger.info('\n✅ Sistema inicializado correctamente');
    logger.info(`   Modo: ${config.nodeEnv}`);
    logger.info(`   Puerto: ${config.port}`);
    logger.info(`   RPCs: Gestionados dinámicamente desde BD`);
    logger.info(`   Workers: ${config.worker.instances} configurados\n`);

    // Aquí se puede iniciar un servidor HTTP si es necesario
    // Por ahora, el backend se usa principalmente a través de scripts

  } catch (error) {
    logger.error('❌ Error iniciando el sistema:', error);
    process.exit(1);
  }
}

// Manejar señales de terminación
process.on('SIGINT', async () => {
  logger.info('\n⚠️  Señal SIGINT recibida. Cerrando sistema...');
  await database.disconnect();
  await rabbitmq.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('\n⚠️  Señal SIGTERM recibida. Cerrando sistema...');
  await database.disconnect();
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

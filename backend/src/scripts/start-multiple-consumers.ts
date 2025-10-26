#!/usr/bin/env ts-node

import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { config } from '../config/environment';
import { logger } from '../utils/logger';

async function main() {
  logger.info('═══════════════════════════════════════════════════');
  logger.info('   INICIANDO MÚLTIPLES CONSUMIDORES');
  logger.info('═══════════════════════════════════════════════════\n');

  const numConsumers = config.worker.instances;
  logger.info(`🚀 Iniciando ${numConsumers} consumidores...\n`);

  const consumers: ChildProcess[] = [];

  // Iniciar consumidores
  for (let i = 0; i < numConsumers; i++) {
    const consumerScript = path.join(__dirname, 'start-consumer.ts');

    const consumer = spawn('ts-node', [consumerScript], {
      stdio: ['inherit', 'pipe', 'pipe'],
      env: process.env,
    });

    consumer.stdout?.on('data', (data) => {
      logger.info(`[Consumer ${i + 1}] ${data.toString().trim()}`);
    });

    consumer.stderr?.on('data', (data) => {
      logger.error(`[Consumer ${i + 1}] ${data.toString().trim()}`);
    });

    consumer.on('exit', (code) => {
      if (code !== 0) {
        logger.error(`❌ Consumer ${i + 1} terminó con código: ${code}`);
      } else {
        logger.info(`✅ Consumer ${i + 1} terminó correctamente`);
      }
    });

    consumers.push(consumer);
    logger.info(`✅ Consumer ${i + 1} iniciado (PID: ${consumer.pid})`);

    // Pequeño delay entre inicios
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  logger.info(`\n✅ Todos los ${numConsumers} consumidores iniciados`);
  logger.info('   Presiona Ctrl+C para detener todos los consumidores\n');

  // Manejar señal de terminación
  process.on('SIGINT', () => {
    logger.info('\n⚠️  Deteniendo todos los consumidores...');

    consumers.forEach((consumer, index) => {
      consumer.kill('SIGTERM');
      logger.info(`   Consumidor ${index + 1} detenido`);
    });

    process.exit(0);
  });

  // Mantener el proceso vivo
  await new Promise(() => {});
}

// Ejecutar
if (require.main === module) {
  main().catch((error) => {
    logger.error('Error no controlado:', error);
    process.exit(1);
  });
}

export { main };

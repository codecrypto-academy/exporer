/**
 * Script para verificar la configuración del sistema
 * Muestra los valores actuales de todas las variables de entorno importantes
 */

import { config } from '../config/environment';

// Colores ANSI
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

const c = colors; // Alias corto

console.log('\n' + c.blue + c.bright + '═'.repeat(60) + c.reset);
console.log(c.blue + c.bright + '📋 VERIFICACIÓN DE CONFIGURACIÓN DEL SISTEMA' + c.reset);
console.log(c.blue + c.bright + '═'.repeat(60) + c.reset + '\n');

// PostgreSQL
console.log(c.cyan + c.bright + '🐘 PostgreSQL:' + c.reset);
console.log(`   Host:     ${c.green}${config.database.host}${c.reset}`);
console.log(`   Port:     ${c.green}${config.database.port}${c.reset}`);
console.log(`   User:     ${c.green}${config.database.user}${c.reset}`);
console.log(`   Database: ${c.green}${config.database.database}${c.reset}`);
console.log('');

// RabbitMQ
console.log(c.cyan + c.bright + '🐰 RabbitMQ:' + c.reset);
console.log(`   URL:   ${c.green}${config.rabbitmq.url}${c.reset}`);
console.log(`   Colas:`);
console.log(`      - Principal:    ${c.green}${config.rabbitmq.queues.blocks}${c.reset}`);
console.log(`      - Reintentos:   ${c.green}${config.rabbitmq.queues.retries}${c.reset}`);
console.log(`      - Dead Letter:  ${c.green}${config.rabbitmq.queues.deadLetter}${c.reset}`);
console.log('');

// Ethereum
console.log(c.cyan + c.bright + '⛓️  Ethereum:' + c.reset);
console.log(`   Bloque inicial:        ${c.green}${config.ethereum.startBlock.toLocaleString()}${c.reset}`);
console.log(`   Bloque final:          ${c.green}${config.ethereum.endBlock.toLocaleString()}${c.reset}`);
console.log(`   Total de bloques:      ${c.yellow}${(config.ethereum.endBlock - config.ethereum.startBlock).toLocaleString()}${c.reset}`);
console.log(`   Bloques por mensaje:   ${c.yellow}${c.bright}${config.ethereum.blocksPerMessage}${c.reset} ${config.ethereum.blocksPerMessage === 10 ? '✅' : '⚠️'}`);

// Calcular número de mensajes
const totalBlocks = config.ethereum.endBlock - config.ethereum.startBlock;
const totalMessages = Math.ceil(totalBlocks / config.ethereum.blocksPerMessage);
console.log(`   Mensajes a generar:    ${c.yellow}${c.bright}${totalMessages.toLocaleString()}${c.reset}`);
console.log('');

// Workers
console.log(c.cyan + c.bright + '👷 Workers:' + c.reset);
console.log(`   Instancias:          ${c.green}${config.worker.instances}${c.reset}`);
console.log(`   Reintentos máximos:  ${c.green}${config.worker.maxRetries}${c.reset}`);
console.log(`   Delay reintentos:    ${c.green}${config.worker.retryDelay}${c.reset} ms`);
console.log('');

// APIs
console.log(c.cyan + c.bright + '🌐 APIs Externas:' + c.reset);
console.log(`   4byte.directory: ${c.green}${config.apis.fourByteDirectory}${c.reset}`);
console.log('');

// General
console.log(c.cyan + c.bright + '⚙️  General:' + c.reset);
console.log(`   Entorno:    ${c.green}${config.nodeEnv}${c.reset}`);
console.log(`   Puerto API: ${c.green}${config.port}${c.reset}`);
console.log('');

// Advertencias
console.log(c.yellow + c.bright + '⚠️  ADVERTENCIAS:' + c.reset);
let hasWarnings = false;

if (config.ethereum.blocksPerMessage > 100) {
    console.log(c.red + `   - BLOCKS_PER_MESSAGE es ${config.ethereum.blocksPerMessage}, muy alto. Recomendado: 10-100` + c.reset);
    hasWarnings = true;
}
if (config.ethereum.blocksPerMessage !== 10) {
    console.log(c.yellow + `   - BLOCKS_PER_MESSAGE es ${config.ethereum.blocksPerMessage}. Para pruebas, se recomienda 10.` + c.reset);
    hasWarnings = true;
}
if (totalMessages > 1000) {
    console.log(c.yellow + `   - Se generarán ${totalMessages.toLocaleString()} mensajes. Esto puede tomar tiempo.` + c.reset);
    hasWarnings = true;
}
if (config.worker.instances > 10) {
    console.log(c.yellow + `   - ${config.worker.instances} workers es un número alto. Asegúrate de tener suficientes RPCs.` + c.reset);
    hasWarnings = true;
}

if (!hasWarnings) {
    console.log(c.green + '   ✅ No hay advertencias' + c.reset);
}
console.log('');

// Estimaciones
console.log(c.cyan + c.bright + '⏱️  Estimaciones:' + c.reset);
const blocksPerWorker = Math.ceil(totalBlocks / config.worker.instances);
const estimatedMinutes = Math.ceil(totalMessages / config.worker.instances / 6); // ~6 mensajes/minuto por worker
console.log(`   Bloques por worker:  ${c.green}${blocksPerWorker.toLocaleString()}${c.reset}`);
console.log(`   Tiempo estimado:     ${c.green}~${estimatedMinutes} minutos${c.reset} (con ${config.worker.instances} workers)`);
console.log('');

// Resumen
console.log(c.blue + c.bright + '═'.repeat(60) + c.reset);
console.log(c.green + c.bright + '✅ CONFIGURACIÓN VERIFICADA' + c.reset);

if (config.ethereum.blocksPerMessage === 10) {
    console.log(c.green + c.bright + '✅ BLOCKS_PER_MESSAGE está configurado en 10 (correcto)' + c.reset);
} else {
    console.log(c.yellow + c.bright + `⚠️  BLOCKS_PER_MESSAGE está en ${config.ethereum.blocksPerMessage}. Para cambiarlo a 10:` + c.reset);
    console.log(c.yellow + '   1. Edita el archivo .env' + c.reset);
    console.log(c.yellow + '   2. Cambia BLOCKS_PER_MESSAGE=10' + c.reset);
    console.log(c.yellow + '   3. Reinicia el sistema' + c.reset);
}

console.log(c.blue + c.bright + '═'.repeat(60) + c.reset + '\n');

// Mostrar variables de entorno esperadas
console.log(c.gray + '💡 Variables de entorno leídas desde: backend/.env' + c.reset);
console.log(c.gray + '   Para cambiar la configuración, edita ese archivo\n' + c.reset);


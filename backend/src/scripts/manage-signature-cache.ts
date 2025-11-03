/**
 * Script para gestionar y ver estadísticas del caché de event signatures
 */

import { eventSignatureCacheModel } from '../database/models/EventSignatureCache';
import { logger } from '../utils/logger';
import { pool } from '../config/database';

// Colores ANSI
const c = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

async function showStats() {
  console.log('\n' + c.blue + c.bright + '═'.repeat(70) + c.reset);
  console.log(c.blue + c.bright + '📊 ESTADÍSTICAS DEL CACHÉ DE EVENT SIGNATURES' + c.reset);
  console.log(c.blue + c.bright + '═'.repeat(70) + c.reset + '\n');

  try {
    const stats = await eventSignatureCacheModel.getStats();

    // Total
    console.log(c.cyan + c.bright + '📦 Totales:' + c.reset);
    console.log(`   Total de signatures en caché: ${c.green}${stats.total.toLocaleString()}${c.reset}`);
    console.log('');

    // Por fuente
    if (stats.sources.length > 0) {
      console.log(c.cyan + c.bright + '🔍 Por fuente:' + c.reset);
      stats.sources.forEach(source => {
        console.log(`   ${source.source}: ${c.green}${source.count.toLocaleString()}${c.reset}`);
      });
      console.log('');
    }

    // Más usadas
    if (stats.mostUsed.length > 0) {
      console.log(c.cyan + c.bright + '⭐ Top 10 signatures más usadas:' + c.reset);
      console.log(`   ${'#'.padEnd(3)} ${'Event Name'.padEnd(30)} ${'Hits'.padEnd(10)} ${'Signature'.padEnd(20)}`);
      console.log('   ' + '-'.repeat(68));
      stats.mostUsed.forEach((sig, idx) => {
        const rank = (idx + 1).toString().padEnd(3);
        const name = sig.event_name.padEnd(30).substring(0, 30);
        const hits = sig.hit_count.toString().padEnd(10);
        const sigShort = sig.signature.substring(0, 10) + '...';
        console.log(`   ${rank} ${c.green}${name}${c.reset} ${c.yellow}${hits}${c.reset} ${c.gray}${sigShort}${c.reset}`);
      });
      console.log('');
    }

    // Agregadas recientemente
    if (stats.recentlyAdded.length > 0) {
      console.log(c.cyan + c.bright + '🆕 Últimas 10 signatures agregadas:' + c.reset);
      stats.recentlyAdded.forEach(sig => {
        const date = new Date(sig.first_seen_at).toLocaleString();
        console.log(`   ${c.green}${sig.event_name.padEnd(30)}${c.reset} ${c.gray}${date}${c.reset}`);
      });
      console.log('');
    }

    // Eficiencia del caché
    console.log(c.cyan + c.bright + '📈 Eficiencia del caché:' + c.reset);
    const totalHits = stats.mostUsed.reduce((sum, sig) => sum + sig.hit_count, 0);
    const avgHits = stats.total > 0 ? (totalHits / stats.total).toFixed(2) : '0.00';
    console.log(`   Promedio de hits por signature: ${c.yellow}${avgHits}${c.reset}`);
    console.log(`   Total de hits acumulados: ${c.green}${totalHits.toLocaleString()}${c.reset}`);
    console.log('');

  } catch (error) {
    console.error(c.red + '❌ Error al obtener estadísticas:' + c.reset, error);
    throw error;
  }
}

async function cleanupOld(daysOld: number = 90, minHitCount: number = 1) {
  console.log('\n' + c.yellow + c.bright + '🗑️  LIMPIEZA DE CACHÉ ANTIGUO' + c.reset);
  console.log(c.yellow + `Eliminando signatures con más de ${daysOld} días y menos de ${minHitCount} hits...` + c.reset + '\n');

  try {
    const deleted = await eventSignatureCacheModel.cleanupOldEntries(daysOld, minHitCount);
    console.log(c.green + `✅ ${deleted} signatures eliminadas exitosamente` + c.reset + '\n');
  } catch (error) {
    console.error(c.red + '❌ Error al limpiar caché:' + c.reset, error);
    throw error;
  }
}

async function exportCache(filename: string = 'event_signatures_export.json') {
  console.log('\n' + c.blue + c.bright + '📤 EXPORTAR CACHÉ' + c.reset);
  console.log(c.blue + `Exportando a: ${filename}` + c.reset + '\n');

  try {
    const data = await eventSignatureCacheModel.exportAll();
    const fs = await import('fs');
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
    console.log(c.green + `✅ ${data.length} signatures exportadas a ${filename}` + c.reset + '\n');
  } catch (error) {
    console.error(c.red + '❌ Error al exportar:' + c.reset, error);
    throw error;
  }
}

async function truncateCache() {
  console.log('\n' + c.red + c.bright + '⚠️  ADVERTENCIA: ELIMINAR TODO EL CACHÉ' + c.reset);
  console.log(c.yellow + 'Esta operación eliminará TODAS las signatures del caché.' + c.reset);
  console.log(c.yellow + 'El sistema las volverá a consultar de 4byte.directory cuando sean necesarias.\n' + c.reset);

  // En un entorno interactivo, pedirías confirmación aquí
  // Para este script, solo mostramos el comando SQL

  try {
    await pool.query('TRUNCATE TABLE event_signatures_cache RESTART IDENTITY CASCADE');
    console.log(c.green + '✅ Caché completamente limpiado' + c.reset + '\n');
  } catch (error) {
    console.error(c.red + '❌ Error al truncar caché:' + c.reset, error);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'stats':
        await showStats();
        break;

      case 'cleanup':
        const days = parseInt(args[1] || '90', 10);
        const minHits = parseInt(args[2] || '1', 10);
        await cleanupOld(days, minHits);
        break;

      case 'export':
        const filename = args[1] || 'event_signatures_export.json';
        await exportCache(filename);
        break;

      case 'truncate':
        await truncateCache();
        break;

      default:
        console.log('\n' + c.blue + c.bright + '📋 USO DEL SCRIPT' + c.reset + '\n');
        console.log('Comandos disponibles:\n');
        console.log(`  ${c.green}stats${c.reset}              - Mostrar estadísticas del caché`);
        console.log(`  ${c.green}cleanup [días] [hits]${c.reset} - Limpiar entries antiguos (default: 90 días, 1 hit)`);
        console.log(`  ${c.green}export [archivo]${c.reset}     - Exportar caché a JSON (default: event_signatures_export.json)`);
        console.log(`  ${c.red}truncate${c.reset}           - ${c.red}${c.bright}ELIMINAR TODO EL CACHÉ${c.reset}`);
        console.log('\nEjemplos:\n');
        console.log(`  ${c.gray}npm run cache:stats${c.reset}`);
        console.log(`  ${c.gray}npm run cache:cleanup 30 2${c.reset}  # Eliminar signatures > 30 días con < 2 hits`);
        console.log(`  ${c.gray}npm run cache:export backup.json${c.reset}`);
        console.log('');
    }

    await pool.end();
    process.exit(0);
  } catch (error) {
    logger.error('Error en el script:', error);
    await pool.end();
    process.exit(1);
  }
}

main();


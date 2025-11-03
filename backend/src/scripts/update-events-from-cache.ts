/**
 * Script para actualizar la tabla events con nombres desde la caché
 * Actualiza eventos que tienen event_name NULL o 'Unknown'
 */

import { pool } from '../config/database';
import { logger } from '../utils/logger';

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

async function updateEventsFromCache() {
  console.log('\n' + c.blue + c.bright + '═'.repeat(70) + c.reset);
  console.log(c.blue + c.bright + '🔄 ACTUALIZAR EVENTOS DESDE CACHÉ DE SIGNATURES' + c.reset);
  console.log(c.blue + c.bright + '═'.repeat(70) + c.reset + '\n');

  const client = await pool.connect();

  try {
    console.log(c.cyan + '📊 Analizando eventos sin nombre...' + c.reset + '\n');

    // 1. Contar eventos que necesitan actualización
    const countResult = await client.query(`
      SELECT 
        COUNT(*) FILTER (WHERE event_name IS NULL) as null_count,
        COUNT(*) FILTER (WHERE event_name = 'Unknown') as unknown_count,
        COUNT(*) as total_count
      FROM events
    `);

    const { null_count, unknown_count, total_count } = countResult.rows[0];
    const needsUpdate = parseInt(null_count) + parseInt(unknown_count);

    console.log(c.cyan + 'Estado actual:' + c.reset);
    console.log(`   Total de eventos: ${c.green}${parseInt(total_count).toLocaleString()}${c.reset}`);
    console.log(`   Con event_name NULL: ${c.yellow}${parseInt(null_count).toLocaleString()}${c.reset}`);
    console.log(`   Con event_name 'Unknown': ${c.yellow}${parseInt(unknown_count).toLocaleString()}${c.reset}`);
    console.log(`   ${c.bright}Necesitan actualización: ${c.yellow}${needsUpdate.toLocaleString()}${c.reset}\n`);

    if (needsUpdate === 0) {
      console.log(c.green + '✅ No hay eventos que necesiten actualización' + c.reset + '\n');
      return;
    }

    // 2. Contar cuántas signatures hay en caché
    const cacheResult = await client.query(`
      SELECT COUNT(*) as cache_count
      FROM event_signatures_cache
      WHERE event_name != 'Unknown'
    `);
    const cacheCount = parseInt(cacheResult.rows[0].cache_count);

    console.log(c.cyan + 'Caché disponible:' + c.reset);
    console.log(`   Signatures en caché: ${c.green}${cacheCount.toLocaleString()}${c.reset}\n`);

    if (cacheCount === 0) {
      console.log(c.yellow + '⚠️  No hay signatures en caché para actualizar' + c.reset);
      console.log(c.gray + '   Ejecuta el consumer primero para poblar la caché' + c.reset + '\n');
      return;
    }

    // 3. Actualizar eventos desde caché
    console.log(c.cyan + '🔄 Actualizando eventos...' + c.reset + '\n');

    await client.query('BEGIN');

    const updateResult = await client.query(`
      UPDATE events e
      SET 
        event_name = c.event_name
      FROM event_signatures_cache c
      WHERE e.event_signature = c.signature
        AND (e.event_name IS NULL OR e.event_name = 'Unknown')
        AND c.event_name != 'Unknown'
    `);

    await client.query('COMMIT');

    const updated = updateResult.rowCount || 0;

    console.log(c.green + c.bright + `✅ Eventos actualizados: ${updated.toLocaleString()}` + c.reset + '\n');

    // 4. Mostrar estadísticas finales
    const finalResult = await client.query(`
      SELECT 
        COUNT(*) FILTER (WHERE event_name IS NULL) as null_count,
        COUNT(*) FILTER (WHERE event_name = 'Unknown') as unknown_count,
        COUNT(*) FILTER (WHERE event_name IS NOT NULL AND event_name != 'Unknown') as named_count,
        COUNT(*) as total_count
      FROM events
    `);

    const finalStats = finalResult.rows[0];

    console.log(c.cyan + 'Resultado final:' + c.reset);
    console.log(`   Total de eventos: ${c.green}${parseInt(finalStats.total_count).toLocaleString()}${c.reset}`);
    console.log(`   Con nombre: ${c.green}${parseInt(finalStats.named_count).toLocaleString()}${c.reset}`);
    console.log(`   Con 'Unknown': ${c.yellow}${parseInt(finalStats.unknown_count).toLocaleString()}${c.reset}`);
    console.log(`   Con NULL: ${c.yellow}${parseInt(finalStats.null_count).toLocaleString()}${c.reset}\n`);

    // 5. Mostrar top 10 eventos actualizados
    const topEventsResult = await client.query(`
      SELECT 
        event_name,
        COUNT(*) as count
      FROM events
      WHERE event_name IS NOT NULL 
        AND event_name != 'Unknown'
      GROUP BY event_name
      ORDER BY count DESC
      LIMIT 10
    `);

    if (topEventsResult.rows.length > 0) {
      console.log(c.cyan + 'Top 10 eventos más comunes:' + c.reset);
      topEventsResult.rows.forEach((row, idx) => {
        const rank = (idx + 1).toString().padStart(2);
        const name = row.event_name.padEnd(30);
        const count = parseInt(row.count).toLocaleString().padStart(10);
        console.log(`   ${rank}. ${c.green}${name}${c.reset} ${c.yellow}${count}${c.reset}`);
      });
      console.log('');
    }

  } catch (error) {
    await client.query('ROLLBACK');
    console.error(c.red + '❌ Error al actualizar eventos:' + c.reset, error);
    throw error;
  } finally {
    client.release();
  }
}

async function updateSpecificSignatures(signatures: string[]) {
  console.log('\n' + c.blue + c.bright + '═'.repeat(70) + c.reset);
  console.log(c.blue + c.bright + '🔄 ACTUALIZAR EVENTOS ESPECÍFICOS' + c.reset);
  console.log(c.blue + c.bright + '═'.repeat(70) + c.reset + '\n');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const updateResult = await client.query(`
      UPDATE events e
      SET 
        event_name = c.event_name
      FROM event_signatures_cache c
      WHERE e.event_signature = c.signature
        AND e.event_signature = ANY($1::text[])
        AND c.event_name != 'Unknown'
    `, [signatures]);

    await client.query('COMMIT');

    const updated = updateResult.rowCount || 0;
    console.log(c.green + c.bright + `✅ ${updated} eventos actualizados` + c.reset + '\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error(c.red + '❌ Error:' + c.reset, error);
    throw error;
  } finally {
    client.release();
  }
}

async function showMissingSignatures(limit: number = 20) {
  console.log('\n' + c.blue + c.bright + '═'.repeat(70) + c.reset);
  console.log(c.blue + c.bright + '🔍 SIGNATURES FALTANTES EN CACHÉ' + c.reset);
  console.log(c.blue + c.bright + '═'.repeat(70) + c.reset + '\n');

  try {
    const result = await pool.query(`
      SELECT 
        e.event_signature,
        COUNT(*) as event_count
      FROM events e
      LEFT JOIN event_signatures_cache c ON e.event_signature = c.signature
      WHERE c.signature IS NULL
        AND (e.event_name IS NULL OR e.event_name = 'Unknown')
      GROUP BY e.event_signature
      ORDER BY event_count DESC
      LIMIT $1
    `, [limit]);

    if (result.rows.length === 0) {
      console.log(c.green + '✅ Todas las signatures están en caché' + c.reset + '\n');
      return;
    }

    console.log(c.yellow + `Signatures no encontradas en caché (Top ${limit}):` + c.reset + '\n');
    console.log(`   ${'#'.padEnd(4)} ${'Signature'.padEnd(68)} ${'Count'.padEnd(10)}`);
    console.log('   ' + '-'.repeat(84));

    result.rows.forEach((row, idx) => {
      const rank = (idx + 1).toString().padEnd(4);
      const sig = row.event_signature.padEnd(68);
      const count = parseInt(row.event_count).toLocaleString().padEnd(10);
      console.log(`   ${rank} ${c.gray}${sig}${c.reset} ${c.yellow}${count}${c.reset}`);
    });

    console.log('\n' + c.cyan + '💡 Estas signatures necesitan ser consultadas en 4byte.directory' + c.reset);
    console.log(c.gray + '   Ejecuta el consumer para que las agregue a la caché automáticamente\n' + c.reset);

  } catch (error) {
    console.error(c.red + '❌ Error:' + c.reset, error);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'update':
        await updateEventsFromCache();
        break;

      case 'missing':
        const limit = parseInt(args[1] || '20', 10);
        await showMissingSignatures(limit);
        break;

      case 'specific':
        if (args.length < 2) {
          console.log(c.red + 'Error: Debes proporcionar al menos una signature' + c.reset);
          console.log(`Uso: npm run events:update specific 0xabc... 0xdef...`);
          process.exit(1);
        }
        const signatures = args.slice(1);
        await updateSpecificSignatures(signatures);
        break;

      default:
        console.log('\n' + c.blue + c.bright + '📋 USO DEL SCRIPT' + c.reset + '\n');
        console.log('Comandos disponibles:\n');
        console.log(`  ${c.green}update${c.reset}              - Actualizar todos los eventos desde caché`);
        console.log(`  ${c.green}missing [limit]${c.reset}     - Mostrar signatures faltantes en caché (default: 20)`);
        console.log(`  ${c.green}specific <sig1> <sig2>${c.reset} - Actualizar solo signatures específicas`);
        console.log('\nEjemplos:\n');
        console.log(`  ${c.gray}npm run events:update${c.reset}`);
        console.log(`  ${c.gray}npm run events:missing 50${c.reset}`);
        console.log(`  ${c.gray}npm run events:update-specific 0xddf252ad... 0x8c5be1e5...${c.reset}`);
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


/**
 * Script rápido para verificar locks en RPCs
 */
import { pool } from '../config/database';

async function checkLocks() {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE in_use = true) as rpcs_en_uso,
        COUNT(*) FILTER (WHERE active = true AND in_use = false) as rpcs_disponibles,
        COUNT(*) FILTER (WHERE active = false) as rpcs_inactivos,
        COUNT(*) as total_rpcs
      FROM rpcs
    `);

    const stats = result.rows[0];
    
    console.log('\n🔍 ESTADO DE RPCs');
    console.log('═'.repeat(50));
    console.log(`Total de RPCs:       ${stats.total_rpcs}`);
    console.log(`RPCs activos y disponibles: ${stats.rpcs_disponibles}`);
    console.log(`RPCs en uso (locked): ${stats.rpcs_en_uso}`);
    console.log(`RPCs inactivos:      ${stats.rpcs_inactivos}`);
    
    if (parseInt(stats.rpcs_disponibles) === 0) {
      console.log('\n⚠️  PROBLEMA DETECTADO: No hay RPCs disponibles!');
      console.log('Todos están marcados como "in_use" o "inactive"');
      console.log('\nSolución:');
      console.log('  npm run rpcs:unlock');
    } else {
      console.log('\n✅ Hay RPCs disponibles');
    }
    
    // Mostrar RPCs que están en uso
    const inUseResult = await pool.query(`
      SELECT id, name, url, in_use
      FROM rpcs
      WHERE in_use = true
      LIMIT 10
    `);
    
    if (inUseResult.rows.length > 0) {
      console.log('\n📋 RPCs actualmente en uso:');
      inUseResult.rows.forEach(rpc => {
        console.log(`  - ${rpc.name} (ID: ${rpc.id})`);
      });
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
    process.exit(1);
  }
}

checkLocks();


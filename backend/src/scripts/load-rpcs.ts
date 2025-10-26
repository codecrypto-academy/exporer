#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import { database } from '../config/database';
import { RPC, RPCData } from '../database/models/RPC';
import { logger } from '../utils/logger';

interface RPCJsonData {
  name: string;
  url: string;
  lastBlock?: number;
  date?: string;
  active: boolean;
  tested?: boolean;
  executionTime?: string;
  registros?: number;
  error?: string;
}

async function loadRPCs() {
  try {
    logger.info('🚀 Iniciando carga de RPCs desde JSON...');

    // Conectar a la base de datos
    await database.connect();

    // Leer el archivo rpcs.json
    const rpcsFilePath = path.join(__dirname, '../../../logs-eth/rpcs.json');

    if (!fs.existsSync(rpcsFilePath)) {
      throw new Error(`Archivo no encontrado: ${rpcsFilePath}`);
    }

    const fileContent = fs.readFileSync(rpcsFilePath, 'utf-8');
    const rpcsData: RPCJsonData[] = JSON.parse(fileContent);

    logger.info(`📊 Se encontraron ${rpcsData.length} RPCs en el archivo JSON`);

    // Estadísticas
    let inserted = 0;
    let updated = 0;
    let active = 0;
    let inactive = 0;
    let errors = 0;

    // Procesar cada RPC
    for (const rpcJson of rpcsData) {
      try {
        const rpcData: RPCData = {
          name: rpcJson.name,
          url: rpcJson.url,
          last_block: rpcJson.lastBlock || null,
          last_update: rpcJson.date ? new Date(rpcJson.date) : null,
          active: rpcJson.active,
          tested: rpcJson.tested || false,
          execution_time: rpcJson.executionTime || null,
          registros: rpcJson.registros || null,
          error: rpcJson.error || null,
        };

        // Verificar si el RPC ya existe
        const existsQuery = 'SELECT id FROM rpcs WHERE url = $1';
        const existsResult = await database.query(existsQuery, [rpcData.url]);

        if (existsResult.rows.length > 0) {
          updated++;
        } else {
          inserted++;
        }

        // Insertar o actualizar
        await RPC.upsert(rpcData);

        // Actualizar estadísticas
        if (rpcData.active) {
          active++;
        } else {
          inactive++;
        }

        if (rpcData.error) {
          errors++;
        }

        logger.debug(`✅ Procesado: ${rpcData.name} (${rpcData.url})`);
      } catch (error) {
        logger.error(`❌ Error procesando RPC ${rpcJson.name}:`, error);
      }
    }

    // Mostrar resumen
    logger.info('\n📈 RESUMEN DE CARGA DE RPCs:');
    logger.info(`   Total procesados: ${rpcsData.length}`);
    logger.info(`   Nuevos insertados: ${inserted}`);
    logger.info(`   Actualizados: ${updated}`);
    logger.info(`   Activos: ${active}`);
    logger.info(`   Inactivos: ${inactive}`);
    logger.info(`   Con errores: ${errors}`);

    // Verificar total en base de datos
    const totalActive = await RPC.countActive();
    logger.info(`\n✅ Total de RPCs activos en la base de datos: ${totalActive}`);

    // Mostrar algunos RPCs activos de ejemplo
    const activeRPCs = await RPC.getActive();
    if (activeRPCs.length > 0) {
      logger.info('\n📋 Primeros 5 RPCs activos:');
      activeRPCs.slice(0, 5).forEach((rpc, index) => {
        logger.info(`   ${index + 1}. ${rpc.name} - ${rpc.url}`);
      });
    }

    logger.info('\n🎉 Carga de RPCs completada exitosamente!');
  } catch (error) {
    logger.error('❌ Error fatal al cargar RPCs:', error);
    process.exit(1);
  } finally {
    await database.disconnect();
  }
}

// Ejecutar el script
if (require.main === module) {
  loadRPCs()
    .then(() => {
      logger.info('👋 Script finalizado');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Error en script:', error);
      process.exit(1);
    });
}

export { loadRPCs };

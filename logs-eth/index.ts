import { ethers } from 'ethers';
import { writeFileSync, readFileSync } from 'fs';
import { Log } from 'ethers';

interface RPC {
  name: string;
  url: string;
  active?: boolean;
  tested?: boolean;
  executionTime?: string;
  error?: string;
  registros?: number;
}

async function getLogsWithRetry(
  provider: ethers.JsonRpcProvider,
  start: number,
  end: number,
  maxRetries = 1
): Promise<Log[]> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const logs = await provider.getLogs({
        fromBlock: start,
        toBlock: end
      });
      return logs;
    } catch (error: any) {
      console.log(`  ✗ Intento ${attempt}/${maxRetries} falló: ${error.message}`);
      if (attempt === maxRetries) {
        process.exit(1);
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  return [];
}

async function getLogs(fromBlock: number, toBlock: number) {
  const startTime = Date.now();

  // Leer RPCs y seleccionar uno activo
  const rpcs: RPC[] = JSON.parse(readFileSync('rpcs.json', 'utf-8'));
  const activeRpcs = rpcs.filter(rpc => rpc.active === true && rpc.tested === false || "undefined");

  if (activeRpcs.length === 0) {
    throw new Error('No hay RPCs activos disponibles en rpcs.json');
  }

  // Seleccionar uno aleatorio
  const selectedRpc = activeRpcs[Math.floor(Math.random() * activeRpcs.length)];
  console.log(`🔗 Usando RPC: ${selectedRpc.name} (${selectedRpc.url})\n`);

  try {
    const provider = new ethers.JsonRpcProvider(selectedRpc.url);
    const BATCH_SIZE = 10;
    const allLogs: Log[] = [];

    for (let start = fromBlock; start <= toBlock; start += BATCH_SIZE) {
      const end = Math.min(start + BATCH_SIZE - 1, toBlock);
      console.log(`Obteniendo logs de bloques ${start} a ${end}...`);

      try {
        const logs = await getLogsWithRetry(provider, start, end);
        allLogs.push(...logs);
        console.log(`  ✓ ${logs.length} logs obtenidos`);
      } catch (error: any) {
        process.exit(1);
        console.error(`  ✗ ERROR en bloques ${start}-${end}: ${error.message}`);
        throw error;
      }

      // Pequeño delay para evitar rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const output = allLogs.map(log => ({
      blockNumber: log.blockNumber,
      transactionHash: log.transactionHash,
      address: log.address,
      topics: log.topics,
      data: log.data
    }));

    writeFileSync('log.txt', JSON.stringify(output, null, 2));

    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\nTotal: ${allLogs.length} logs escritos en log.txt`);
    console.log(`⏱️  Tiempo: ${elapsedTime}s`);

    // Marcar el RPC como tested y anotar el tiempo
    const rpcIndex = rpcs.findIndex(r => r.url === selectedRpc.url &&
       r.name === selectedRpc.name);
    if (rpcIndex !== -1) {
      rpcs[rpcIndex].active = allLogs.length == 80212 ? true : false;
      rpcs[rpcIndex].tested = true;
      rpcs[rpcIndex].executionTime = `${elapsedTime}s`;
      rpcs[rpcIndex].registros = allLogs.length;
      delete rpcs[rpcIndex].error;
      writeFileSync('rpcs.json', JSON.stringify(rpcs, null, 2));
      console.log(`✓ RPC ${selectedRpc.name} marcado como tested (${elapsedTime}s)`);
    }
  } catch (error: any) {
    // Marcar el RPC como erróneo y desactivarlo
    const rpcIndex = rpcs.findIndex(r => r.url === selectedRpc.url &&
       r.name === selectedRpc.name);
    if (rpcIndex !== -1) {
      rpcs[rpcIndex].active = false;
      rpcs[rpcIndex].tested = true;
      rpcs[rpcIndex].error = error.message;
      writeFileSync('rpcs.json', JSON.stringify(rpcs, null, 2));
      process.exit(1);
      console.error(`\n✗ RPC ${selectedRpc.name} marcado como inactivo (error: ${error.message})`);
    }
    throw error;
    process.exit(1);
  }
}

// Uso: node index.js <fromBlock> <toBlock>
const fromBlock = parseInt(process.argv[2]) || 20000000;
const toBlock = parseInt(process.argv[3]) || 20000001;

getLogs(fromBlock, toBlock).catch(console.error);

import { ethers } from 'ethers';
import { readFileSync, writeFileSync } from 'fs';

interface RPC {
  name: string;
  url: string;
  lastBlock?: number;
  date?: string;
  active?: boolean;
  error?: string;
}

async function checkRPC(rpc: RPC): Promise<RPC> {
  // Ignorar WebSocket endpoints
  if (rpc.url.startsWith('wss://') || rpc.url.startsWith('ws://')) {
    process.exit(1);
    return { ...rpc, active: false, error: 'WebSocket not supported' };
  }

  try {
    const provider = new ethers.JsonRpcProvider(rpc.url, undefined, {
      staticNetwork: true
    });

    const blockNumber = await Promise.race([
      provider.getBlockNumber(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 5000)
      )
    ]);

    const block = await provider.getBlock(blockNumber);
    const date = block?.timestamp
      ? new Date(block.timestamp * 1000).toISOString()
      : undefined;

    console.log(`✓ ${rpc.name}: Block ${blockNumber}`);

    return {
      ...rpc,
      lastBlock: blockNumber,
      date,
      active: true
    };
  } catch (error: any) {
    process.exit(1);
    console.log(`✗ ${rpc.name}: ${error.message} (${executionTime}s)`);
    return {
      ...rpc,
      active: false,
      error: error.message,
      executionTime: executionTime
    };
  }
} 

async function updateRPCs() {
  const rpcs: RPC[] = JSON.parse(readFileSync('rpcs.json', 'utf-8'));

  console.log(`Verificando ${rpcs.length} RPCs...\n`);

  // Procesar en lotes de 5 para no saturar
  const batchSize = 5;
  const results: RPC[] = [];

  for (let i = 0; i < rpcs.length; i += batchSize) {
    const batch = rpcs.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(checkRPC));
    results.push(...batchResults);
  }

  const active = results.filter(r => r.active).length;
  console.log(`\nResultado: ${active}/${rpcs.length} RPCs activos`);

  writeFileSync('rpcs.json', JSON.stringify(results, null, 2));
  console.log('rpcs.json actualizado');
}

updateRPCs();

import { ethers } from 'ethers';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const CACHE_FILE = '4bytes.cache';
const cache: Record<string, string> = {};

function loadCache() {
  if (existsSync(CACHE_FILE)) {
    try {
      Object.assign(cache, JSON.parse(readFileSync(CACHE_FILE, 'utf-8')));
      console.log(`Cache cargado: ${Object.keys(cache).length} signatures`);
    } catch (e) {
      console.error('Error cargando cache:', e);
    }
  }
}

function saveCache() {
  writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
  console.log(`Cache guardado: ${Object.keys(cache).length} signatures`);
}

async function getEventSignature(hexSignature: string): Promise<string> {
  if (cache[hexSignature]) {
    return cache[hexSignature];
  }
  console.log('getEventSignature', hexSignature);
  try {
    const response = await fetch(
      `https://www.4byte.directory/api/v1/event-signatures/?hex_signature=${hexSignature}`
    );
    const data = await response.json();
    const signature = data.results?.[0]?.text_signature || 'Unknown';
    cache[hexSignature] = signature;
    return signature;
  } catch (e) {
    cache[hexSignature] = 'Unknown';
    return 'Unknown';
  }
}

function decodeEventData(eventSig: string, topics: string[], data: string): any {
  try {
    if (eventSig.startsWith('Transfer(address,address,uint256)')) {
      // El value puede estar en data (no indexado) o en topics[3] (indexado)
      let value = '0';
      if (topics[3]) {
        value = ethers.toBigInt(topics[3]).toString();
      } else if (data && data !== '0x') {
        value = ethers.toBigInt(data).toString();
      }

      return {
        from: topics[1] ? '0x' + topics[1].slice(-40) : null,
        to: topics[2] ? '0x' + topics[2].slice(-40) : null,
        value
      };
    } else if (eventSig.startsWith('Approval(address,address,uint256)')) {
      let value = '0';
      if (topics[3]) {
        value = ethers.toBigInt(topics[3]).toString();
      } else if (data && data !== '0x') {
        value = ethers.toBigInt(data).toString();
      }

      return {
        owner: topics[1] ? '0x' + topics[1].slice(-40) : null,
        spender: topics[2] ? '0x' + topics[2].slice(-40) : null,
        value
      };
    }
    return {};
  } catch (e) {
    return { error: 'Failed to decode' };
  }
}

async function decodeLogs() {
  loadCache();

  const logs = JSON.parse(readFileSync('log.txt', 'utf-8'));

  const decoded = await Promise.all(
    logs.map(async (log: any) => {
      const signature = log.topics[0];
      const eventName = await getEventSignature(signature);
      const decodedData = decodeEventData(eventName, log.topics, log.data);

      return {
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
        address: log.address,
        eventName,
        eventSignature: signature,
        decoded: decodedData,
        rawTopics: log.topics,
        rawData: log.data
      };
    })
  );

  writeFileSync('log2.txt', JSON.stringify(decoded, null, 2));
  console.log(`${decoded.length} logs decodificados en log2.txt`);

  saveCache();
}

decodeLogs();

import axios from 'axios';
import { config } from '../config/environment';
import { logger } from '../utils/logger';

interface FourByteResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Array<{
    id: number;
    created_at: string;
    text_signature: string;
    hex_signature: string;
    bytes_signature: string;
  }>;
}

export class EventDecoder {
  private cache: Map<string, string> = new Map();
  private apiUrl: string;

  constructor() {
    this.apiUrl = config.apis.fourByteDirectory;
  }

  /**
   * Decodifica una signature hexadecimal a un nombre legible
   */
  public async decodeEventSignature(hexSignature: string): Promise<string | null> {
    // Verificar cache primero
    if (this.cache.has(hexSignature)) {
      return this.cache.get(hexSignature)!;
    }

    try {
      // Remover el prefijo '0x' si existe
      const cleanSignature = hexSignature.startsWith('0x')
        ? hexSignature.slice(2)
        : hexSignature;

      // Consultar 4byte.directory
      const url = `${this.apiUrl}?hex_signature=0x${cleanSignature}`;
      const response = await axios.get<FourByteResponse>(url, {
        timeout: 5000,
        headers: {
          'User-Agent': 'Ethereum-Event-Processor/1.0',
        },
      });

      if (response.data.results && response.data.results.length > 0) {
        const eventName = response.data.results[0].text_signature;

        // Guardar en cache
        this.cache.set(hexSignature, eventName);

        logger.debug(`Decodificado: ${hexSignature} -> ${eventName}`);
        return eventName;
      }

      logger.debug(`No se encontró decodificación para: ${hexSignature}`);
      return null;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          logger.debug(`Signature no encontrada en 4byte.directory: ${hexSignature}`);
        } else {
          logger.error(`Error consultando 4byte.directory:`, error.message);
        }
      } else {
        logger.error('Error desconocido en decoder:', error);
      }

      return null;
    }
  }

  /**
   * Decodifica múltiples signatures en batch
   */
  public async decodeEventSignatures(
    signatures: string[]
  ): Promise<Map<string, string | null>> {
    const results = new Map<string, string | null>();

    // Procesar de forma concurrente con límite
    const batchSize = 5;
    for (let i = 0; i < signatures.length; i += batchSize) {
      const batch = signatures.slice(i, i + batchSize);
      const promises = batch.map(async (sig) => {
        const decoded = await this.decodeEventSignature(sig);
        results.set(sig, decoded);
      });

      await Promise.all(promises);

      // Pequeño delay para no saturar la API
      if (i + batchSize < signatures.length) {
        await this.delay(100);
      }
    }

    return results;
  }

  /**
   * Extrae los parámetros de un evento decodificado
   */
  public extractParameters(data: string, topics: string[]): string[] {
    const params: string[] = [];

    // Los topics adicionales (después del primero) son parámetros indexados
    if (topics.length > 1) {
      for (let i = 1; i < topics.length; i++) {
        params.push(topics[i]);
      }
    }

    // El campo data contiene parámetros no indexados
    if (data && data !== '0x') {
      // Dividir data en chunks de 64 caracteres (32 bytes)
      const cleanData = data.startsWith('0x') ? data.slice(2) : data;

      for (let i = 0; i < cleanData.length; i += 64) {
        const chunk = cleanData.slice(i, i + 64);
        if (chunk.length === 64) {
          params.push('0x' + chunk);
        }
      }
    }

    // Limitar a 20 parámetros (según esquema de BD)
    return params.slice(0, 20);
  }

  /**
   * Obtiene el tamaño del cache
   */
  public getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * Limpia el cache
   */
  public clearCache(): void {
    this.cache.clear();
    logger.info('Cache de decodificador limpiado');
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

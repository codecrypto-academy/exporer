import axios from 'axios';
import { config } from '../config/environment';
import { logger } from '../utils/logger';
import { eventSignatureCacheModel } from '../database/models/EventSignatureCache';

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
  private memoryCache: Map<string, string> = new Map();
  private apiUrl: string;

  constructor() {
    this.apiUrl = config.apis.fourByteDirectory;
  }

  /**
   * Decodifica una signature hexadecimal a un nombre legible
   * Orden de búsqueda: 1) Memoria, 2) Base de datos, 3) 4byte.directory API
   */
  public async decodeEventSignature(hexSignature: string): Promise<string | null> {
    // 1. Verificar cache en memoria primero (más rápido)
    if (this.memoryCache.has(hexSignature)) {
      return this.memoryCache.get(hexSignature)!;
    }

    // 2. Verificar cache en base de datos (persistente)
    try {
      const cached = await eventSignatureCacheModel.findBySignature(hexSignature);
      if (cached) {
        // Guardar en memoria para próximas consultas
        this.memoryCache.set(hexSignature, cached.event_name);
        logger.debug(`📦 Cache DB hit: ${hexSignature} -> ${cached.event_name}`);
        return cached.event_name;
      }
    } catch (error) {
      logger.warn('Error al consultar cache de BD, continuando con API:', error);
    }

    const maxRetries = 3;
    //let lastError: any = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Remover el prefijo '0x' si existe
        const cleanSignature = hexSignature.startsWith('0x')
          ? hexSignature.slice(2)
          : hexSignature;

        // Consultar 4byte.directory
        const url = `${this.apiUrl}?hex_signature=0x${cleanSignature}`;
        const response = await axios.get<FourByteResponse>(url, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Ethereum-Event-Processor/1.0',
          },
        });

        if (response.data.results && response.data.results.length > 0) {
          const textSignature = response.data.results[0].text_signature;
          const eventName = textSignature.split('(')[0]; // Extraer solo el nombre

          // Guardar en cache de memoria
          this.memoryCache.set(hexSignature, eventName);

          // Guardar en cache de base de datos (asíncrono, no bloqueante)
          eventSignatureCacheModel.create({
            signature: hexSignature,
            event_name: eventName,
            text_signature: textSignature,
            source: '4byte.directory',
          }).catch(err => {
            logger.warn('Error al guardar en cache de BD:', err);
          });

          logger.debug(`🔍 API hit: ${hexSignature} -> ${eventName}`);
          return eventName;
        }

        logger.debug(`No se encontró decodificación para: ${hexSignature}`);
        
        // Guardar en cache como no encontrado para no reintentar
        this.memoryCache.set(hexSignature, 'Unknown');
        
        // También guardar en BD como Unknown
        eventSignatureCacheModel.create({
          signature: hexSignature,
          event_name: 'Unknown',
          source: '4byte.directory',
        }).catch(err => {
          logger.warn('Error al guardar Unknown en cache de BD:', err);
        });
        
        return null;
      } catch (error) {
        //lastError = error;

        if (axios.isAxiosError(error)) {
          const status = error.response?.status;

          if (status === 404) {
            logger.debug(`Signature no encontrada: ${hexSignature}`);
            this.memoryCache.set(hexSignature, 'Unknown');
            
            // Guardar en BD
            eventSignatureCacheModel.create({
              signature: hexSignature,
              event_name: 'Unknown',
              source: '4byte.directory',
            }).catch(err => logger.warn('Error al guardar en cache de BD:', err));
            
            return null;
          } else if (status === 429) {
            // Rate limit - esperar más tiempo y reintentar
            const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
            logger.warn(`⏳ Rate limit (429) - Esperando ${waitTime}ms antes de reintentar...`);
            await this.delay(waitTime);
            continue;
          } else {
            logger.warn(`Error HTTP ${status} consultando 4byte.directory para ${hexSignature}`);
          }
        }

        // Si es el último intento, registrar el error
        if (attempt === maxRetries - 1) {
          logger.error(`Error tras ${maxRetries} intentos:`, error instanceof Error ? error.message : error);
        }
      }
    }

    // Si todos los reintentos fallaron, guardar como desconocido
    this.memoryCache.set(hexSignature, 'Unknown');
    
    // Guardar en BD
    eventSignatureCacheModel.create({
      signature: hexSignature,
      event_name: 'Unknown',
      source: '4byte.directory',
    }).catch(err => logger.warn('Error al guardar en cache de BD:', err));
    
    return null;
  }

  /**
   * Decodifica múltiples signatures en batch
   */
  public async decodeEventSignatures(
    signatures: string[]
  ): Promise<Map<string, string | null>> {
    const results = new Map<string, string | null>();

    // Procesar de forma secuencial para evitar rate limiting
    for (const sig of signatures) {
      const decoded = await this.decodeEventSignature(sig);
      results.set(sig, decoded);
      
      // Delay entre requests para no saturar la API
      await this.delay(200);
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
   * Obtiene el tamaño del cache en memoria
   */
  public getMemoryCacheSize(): number {
    return this.memoryCache.size;
  }

  /**
   * Obtiene estadísticas del cache (memoria y BD)
   */
  public async getCacheStats(): Promise<{
    memorySize: number;
    databaseStats: any;
  }> {
    const memorySize = this.memoryCache.size;
    const databaseStats = await eventSignatureCacheModel.getStats();
    
    return {
      memorySize,
      databaseStats,
    };
  }

  /**
   * Limpia el cache en memoria (no afecta la BD)
   */
  public clearMemoryCache(): void {
    this.memoryCache.clear();
    logger.info('🗑️ Cache de memoria limpiado');
  }

  /**
   * Limpia el cache antiguo de la BD
   */
  public async cleanupDatabaseCache(daysOld: number = 90, minHitCount: number = 1): Promise<number> {
    const deleted = await eventSignatureCacheModel.cleanupOldEntries(daysOld, minHitCount);
    logger.info(`🗑️ Cache de BD limpiado: ${deleted} entradas eliminadas`);
    return deleted;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

# 📦 Sistema de Caché de Event Signatures

Este sistema implementa un caché persistente de traducciones de event signatures (hexadecimal) a nombres legibles.

## 🎯 Objetivo

Reducir las consultas a la API de `4byte.directory` almacenando las traducciones en una base de datos PostgreSQL, mejorando:

- ⚡ **Rendimiento**: Consultas más rápidas (BD local vs API externa)
- 💰 **Costos**: Menos llamadas a APIs externas
- 🔒 **Resiliencia**: Funciona aunque la API externa esté caída
- 📊 **Analítica**: Tracking de signatures más usadas

## 🏗️ Arquitectura

### Niveles de Caché (en orden de consulta):

1. **Memoria (Map)**: Cache volátil, ultra rápido
2. **Base de Datos (PostgreSQL)**: Cache persistente
3. **API externa (4byte.directory)**: Solo si no está en caché

```
┌─────────────────────┐
│  Event Signature    │
│  0xddf252ad...      │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ 1. Buscar en Memoria│ ← Ultra rápido
│    Map<string,str>  │
└──────┬──────────────┘
       │ NO ENCONTRADO
       ▼
┌─────────────────────┐
│ 2. Buscar en BD     │ ← Rápido (local)
│    event_signatures │
│    _cache table     │
└──────┬──────────────┘
       │ NO ENCONTRADO
       ▼
┌─────────────────────┐
│ 3. Consultar API    │ ← Lento (externo)
│    4byte.directory  │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Guardar en BD + Mem │
│ y devolver resultado│
└─────────────────────┘
```

## 📊 Tabla: `event_signatures_cache`

### Estructura

```sql
CREATE TABLE event_signatures_cache (
    id SERIAL PRIMARY KEY,
    signature VARCHAR(66) NOT NULL UNIQUE,    -- 0xddf252ad...
    event_name VARCHAR(255) NOT NULL,         -- Transfer
    text_signature TEXT,                      -- Transfer(address,address,uint256)
    source VARCHAR(50) DEFAULT '4byte.directory',
    hit_count INTEGER DEFAULT 1,              -- Contador de uso
    first_seen_at TIMESTAMP,
    last_used_at TIMESTAMP,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### Índices

- `idx_event_signatures_signature` - Búsqueda rápida por signature
- `idx_event_signatures_name` - Búsqueda por nombre
- `idx_event_signatures_last_used` - Para limpieza de antiguos

### Datos Pre-cargados

La migración incluye 8 event signatures comunes:

- ✅ `Transfer(address,address,uint256)`
- ✅ `Approval(address,address,uint256)`
- ✅ `Deposit(address,uint256)`
- ✅ `Withdrawal(address,uint256)`
- ✅ `RoleGranted(bytes32,address,address)`
- ✅ `RoleRevoked(bytes32,address,address)`
- ✅ `OwnershipTransferred(address,address)`
- ✅ `ApprovalForAll(address,address,bool)`

## 🚀 Uso

### Desde el Decoder (automático)

El `EventDecoder` usa automáticamente el caché:

```typescript
import { EventDecoder } from './services/decoder';

const decoder = new EventDecoder();
const eventName = await decoder.decodeEventSignature('0xddf252ad...');
// 1. Busca en memoria
// 2. Busca en BD (incrementa hit_count)
// 3. Consulta API si no está
// 4. Guarda en BD y memoria
```

### Modelo Directo

```typescript
import { eventSignatureCacheModel } from './database/models/EventSignatureCache';

// Buscar una signature
const cached = await eventSignatureCacheModel.findBySignature('0xddf252ad...');

// Crear nueva entrada
await eventSignatureCacheModel.create({
  signature: '0xabc123...',
  event_name: 'CustomEvent',
  text_signature: 'CustomEvent(uint256,address)',
  source: 'manual'
});

// Buscar múltiples
const signatures = ['0xaaa...', '0xbbb...', '0xccc...'];
const map = await eventSignatureCacheModel.findManyBySignatures(signatures);
```

## 📊 Gestión del Caché

### Ver Estadísticas

```bash
cd backend
npm run cache:stats
```

Muestra:
- Total de signatures cacheadas
- Signatures por fuente (4byte.directory, manual, etc.)
- Top 10 más usadas
- Últimas 10 agregadas
- Promedio de hits

### Limpiar Entradas Antiguas

```bash
# Eliminar signatures con más de 90 días y menos de 1 hit
npm run cache:cleanup

# Personalizar: >30 días y <2 hits
npm run cache:cleanup 30 2
```

### Exportar Caché

```bash
# Exportar a archivo JSON
npm run cache:export

# Especificar nombre de archivo
npm run cache:export backup_signatures.json
```

### Truncar Todo el Caché

```bash
# ⚠️ CUIDADO: Elimina TODAS las signatures
npm run cache:truncate
```

## 🔧 Script de Reset

El script `reset-system.sh` **NO limpia** la tabla `event_signatures_cache` por defecto para mantener el caché entre resets.

Si quieres limpiarla también, edita el script y descomenta:

```bash
# En scripts/reset-system.sh, línea ~94:
TRUNCATE TABLE event_signatures_cache RESTART IDENTITY CASCADE;
```

## 📈 Métricas y Analítica

### Hit Count

Cada vez que se consulta una signature, su `hit_count` se incrementa automáticamente:

```typescript
const cached = await eventSignatureCacheModel.findBySignature('0xddf252ad...');
// hit_count se incrementa automáticamente
// last_used_at se actualiza a NOW()
```

### Vista de Populares

Vista SQL pre-creada para signatures más usadas:

```sql
SELECT * FROM event_signatures_popular;
-- Muestra signatures con hit_count > 10
```

### Estadísticas Completas

```typescript
const stats = await eventSignatureCacheModel.getStats();
console.log(stats);
/*
{
  total: 1523,
  sources: [
    { source: '4byte.directory', count: 1515 },
    { source: 'manual', count: 8 }
  ],
  mostUsed: [...],
  recentlyAdded: [...]
}
*/
```

## 🔄 Flujo Completo de Decodificación

```typescript
// 1. Consumer procesa un bloque
const logs = await blockchainService.getLogsForBlock(18000000);

// 2. Para cada log
for (const log of logs) {
  // 3. Decoder intenta decodificar
  const eventName = await decoder.decodeEventSignature(log.topics[0]);
  
  // Internamente:
  // a) Busca en memoryCache Map
  if (memoryCache.has(signature)) return memoryCache.get(signature);
  
  // b) Busca en BD
  const cached = await eventSignatureCacheModel.findBySignature(signature);
  if (cached) {
    memoryCache.set(signature, cached.event_name); // Guardar en memoria
    return cached.event_name;
  }
  
  // c) Consulta API
  const response = await axios.get(`4byte.directory/api/...`);
  const eventName = response.data.results[0].text_signature.split('(')[0];
  
  // d) Guarda en BD y memoria
  await eventSignatureCacheModel.create({ signature, event_name, ... });
  memoryCache.set(signature, eventName);
  
  return eventName;
}
```

## 🎯 Mejoras de Rendimiento

### Sin Caché
```
1000 eventos únicos = 1000 llamadas a API
Tiempo: ~200 segundos (200ms por llamada)
```

### Con Caché en Memoria
```
1000 eventos, 100 únicos = 100 llamadas a API
900 hits de cache en memoria
Tiempo: ~20 segundos
```

### Con Caché en BD (después del primer procesamiento)
```
1000 eventos = 0 llamadas a API
1000 hits de cache en BD
Tiempo: ~2 segundos
```

## 🧹 Mantenimiento

### Limpieza Automática (opcional)

Puedes crear un cron job para limpiar entradas antiguas:

```bash
# Cada domingo a las 3 AM
0 3 * * 0 cd /path/to/backend && npm run cache:cleanup 180 2
```

### Backup Regular

```bash
# Backup semanal
npm run cache:export backups/signatures_$(date +%Y%m%d).json
```

## 📝 Migración

Para aplicar la migración:

```bash
# Si Flyway está configurado correctamente
docker-compose run flyway migrate

# Verificar
docker-compose run flyway info
```

La migración `V6__create_event_signatures_cache_table.sql` incluye:
- ✅ Tabla con índices
- ✅ Triggers para auto-actualización
- ✅ 8 signatures pre-cargadas
- ✅ Vista de signatures populares
- ✅ Comentarios de documentación

## 🐛 Troubleshooting

### Error: "Table does not exist"

```bash
# Ejecutar migración
docker-compose run flyway migrate
```

### Caché no se está usando

```bash
# Verificar que la tabla existe
psql -h localhost -U postgres -d ethereum_events \
  -c "SELECT COUNT(*) FROM event_signatures_cache;"

# Ver logs del decoder
# Busca mensajes: "📦 Cache DB hit" o "🔍 API hit"
```

### Demasiadas consultas a la API aún

```bash
# Ver estadísticas del caché
npm run cache:stats

# Si el caché está vacío, los primeros procesamientos
# llenarán el caché progresivamente
```

## 📊 Ejemplos de Consultas SQL

### Ver signatures más populares

```sql
SELECT 
  event_name,
  hit_count,
  last_used_at,
  SUBSTRING(signature, 1, 10) || '...' as sig_short
FROM event_signatures_cache
ORDER BY hit_count DESC
LIMIT 10;
```

### Buscar por nombre

```sql
SELECT * FROM event_signatures_cache
WHERE event_name ILIKE '%transfer%';
```

### Análisis temporal

```sql
SELECT 
  DATE(first_seen_at) as date,
  COUNT(*) as new_signatures
FROM event_signatures_cache
GROUP BY DATE(first_seen_at)
ORDER BY date DESC
LIMIT 7;
```

## ✅ Checklist de Implementación

- [x] Migración V6 creada
- [x] Modelo TypeScript implementado
- [x] Decoder actualizado para usar caché de BD
- [x] Script de gestión de caché
- [x] Comandos npm agregados
- [x] Script de reset actualizado (preserva caché)
- [x] Documentación completa
- [ ] Tests unitarios (TODO)
- [ ] Dashboard web para ver estadísticas (TODO)

---

**Última actualización**: 2025-11-03


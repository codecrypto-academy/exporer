# 🔄 Actualizar Eventos desde Caché

Guía rápida para actualizar la tabla `events` con los nombres de eventos desde la caché de signatures.

## 🎯 ¿Cuándo usar esto?

- ✅ Después de procesar eventos sin tener la caché poblada
- ✅ Cuando tienes eventos con `event_name = NULL` o `'Unknown'`
- ✅ Después de importar signatures manualmente a la caché
- ✅ Para "retroactivamente" nombrar eventos antiguos

## 🚀 Opción 1: Script TypeScript (Recomendado)

### Actualizar todos los eventos

```bash
cd backend
npm run events:update
```

**Qué hace:**
- ✅ Cuenta eventos que necesitan actualización
- ✅ Actualiza todos los eventos con `NULL` o `'Unknown'`
- ✅ Muestra estadísticas antes y después
- ✅ Muestra top 10 eventos más comunes

**Salida esperada:**
```
═══════════════════════════════════════════════════════════════════
🔄 ACTUALIZAR EVENTOS DESDE CACHÉ DE SIGNATURES
═══════════════════════════════════════════════════════════════════

📊 Analizando eventos sin nombre...

Estado actual:
   Total de eventos: 5,432
   Con event_name NULL: 1,234
   Con event_name 'Unknown': 876
   Necesitan actualización: 2,110

Caché disponible:
   Signatures en caché: 156

🔄 Actualizando eventos...

✅ Eventos actualizados: 1,987

Resultado final:
   Total de eventos: 5,432
   Con nombre: 5,309
   Con 'Unknown': 123
   Con NULL: 0

Top 10 eventos más comunes:
    1. Transfer                      3,456
    2. Approval                      1,234
    3. Swap                            567
    ...
```

### Ver signatures faltantes en caché

```bash
npm run events:missing
```

Muestra las signatures que NO están en la caché y cuántos eventos afectan:

```bash
# Ver top 50 signatures faltantes
npm run events:missing 50
```

### Actualizar signatures específicas

```bash
npm run events:update-specific 0xddf252ad... 0x8c5be1e5...
```

## 🚀 Opción 2: Script SQL Directo

```bash
psql -h localhost -U postgres -d ethereum_events \
  -f flyway/sql/maintenance/update_events_from_cache.sql
```

**Ventajas:**
- ⚡ Más rápido (todo en SQL)
- 🔍 Muestra análisis completo
- 📊 Salida formateada en terminal

## 📋 Casos de Uso

### Caso 1: Primeros eventos sin caché

**Problema:** Procesaste bloques antes de tener la tabla `event_signatures_cache`

**Solución:**
```bash
# 1. Procesa algunos bloques para poblar la caché
npm run start:consumer

# 2. Una vez que tengas signatures en caché, actualiza eventos antiguos
npm run events:update
```

### Caso 2: Importar signatures manualmente

**Problema:** Tienes una lista de signatures conocidas que quieres agregar

**Solución:**
```sql
-- 1. Insertar signatures manualmente
INSERT INTO event_signatures_cache (signature, event_name, text_signature, source)
VALUES 
  ('0xabc123...', 'CustomEvent', 'CustomEvent(uint256)', 'manual'),
  ('0xdef456...', 'AnotherEvent', 'AnotherEvent(address)', 'manual');

-- 2. Actualizar eventos
npm run events:update
```

### Caso 3: Verificar cuántos eventos necesitan actualización

```bash
# Ver análisis completo
npm run events:missing

# Conectar a BD directamente
psql -h localhost -U postgres -d ethereum_events

SELECT 
    COUNT(*) FILTER (WHERE event_name IS NULL) as null_count,
    COUNT(*) FILTER (WHERE event_name = 'Unknown') as unknown_count,
    COUNT(*) as total
FROM events;
```

## 🔍 SQL Útiles

### Ver eventos sin nombre

```sql
SELECT 
    event_signature,
    COUNT(*) as cantidad
FROM events
WHERE event_name IS NULL OR event_name = 'Unknown'
GROUP BY event_signature
ORDER BY cantidad DESC
LIMIT 20;
```

### Ver signatures en caché

```sql
SELECT 
    signature,
    event_name,
    text_signature,
    hit_count
FROM event_signatures_cache
WHERE event_name != 'Unknown'
ORDER BY hit_count DESC
LIMIT 20;
```

### Actualización manual específica

```sql
UPDATE events e
SET event_name = c.event_name
FROM event_signatures_cache c
WHERE e.event_signature = c.signature
  AND e.event_signature = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
  AND c.event_name != 'Unknown';
```

## ⚠️ Consideraciones

### Rendimiento

- ✅ La actualización es rápida (usa índices)
- ✅ Se ejecuta en transacción (rollback si falla)
- ⚠️ Para millones de eventos, puede tomar 1-2 minutos

### Seguridad

- ✅ Solo actualiza eventos con `NULL` o `'Unknown'`
- ✅ No sobrescribe nombres válidos existentes
- ✅ Rollback automático si hay error

### Limitaciones

- ⚠️ Solo actualiza si la signature está en caché
- ⚠️ No consulta 4byte.directory durante la actualización
- ⚠️ Signatures con `'Unknown'` en caché no se actualizarán

## 🔄 Flujo Recomendado

```bash
# 1. Ver estado actual
npm run events:missing

# 2. Si tienes muchas signatures faltantes, procesa más bloques
npm run start:consumer

# 3. Una vez tengas buena cobertura en caché, actualiza
npm run events:update

# 4. Ver estadísticas de la caché
npm run cache:stats
```

## 📊 Ejemplo Completo

```bash
# Terminal 1: Ver estado inicial
$ psql -h localhost -U postgres -d ethereum_events -c \
  "SELECT COUNT(*) FROM events WHERE event_name IS NULL"
  
count
-------
 2500

# Terminal 2: Actualizar
$ cd backend
$ npm run events:update

✅ Eventos actualizados: 2,345

# Terminal 3: Verificar
$ psql -h localhost -U postgres -d ethereum_events -c \
  "SELECT COUNT(*) FROM events WHERE event_name IS NOT NULL"
  
count
-------
 4845

# Las 155 restantes no están en caché aún
```

## 🎓 Tips

1. **Ejecuta el consumer primero** para poblar la caché con signatures comunes
2. **Usa `events:missing`** para identificar signatures que faltan
3. **Ejecuta `events:update`** periódicamente después de procesar nuevos bloques
4. **Verifica el `hit_count`** en la caché para ver qué signatures son populares

---

**Ver también:**
- [CACHE_SIGNATURES.md](./CACHE_SIGNATURES.md) - Sistema de caché completo
- [README.md](./README.md) - Documentación general


-- Script: Actualizar tabla events con nombres desde caché
-- Descripción: Actualiza event_name en la tabla events usando la tabla event_signatures_cache
-- Uso: psql -h localhost -U postgres -d ethereum_events -f update_events_from_cache.sql

-- ============================================
-- ANÁLISIS INICIAL
-- ============================================

\echo ''
\echo '📊 ANÁLISIS DE EVENTOS'
\echo '======================================'

SELECT 
    'Total de eventos' AS descripcion,
    COUNT(*) AS cantidad
FROM events
UNION ALL
SELECT 
    'Con event_name NULL',
    COUNT(*)
FROM events
WHERE event_name IS NULL
UNION ALL
SELECT 
    'Con event_name = Unknown',
    COUNT(*)
FROM events
WHERE event_name = 'Unknown'
UNION ALL
SELECT 
    'Con nombre válido',
    COUNT(*)
FROM events
WHERE event_name IS NOT NULL AND event_name != 'Unknown';

\echo ''
\echo '📦 CACHÉ DISPONIBLE'
\echo '======================================'

SELECT 
    'Signatures en caché' AS descripcion,
    COUNT(*) AS cantidad
FROM event_signatures_cache
WHERE event_name != 'Unknown';

\echo ''
\echo '🔄 ACTUALIZANDO EVENTOS...'
\echo '======================================'

-- ============================================
-- ACTUALIZACIÓN
-- ============================================

BEGIN;

-- Actualizar eventos que tienen NULL o 'Unknown'
-- usando los datos de la caché
UPDATE events e
SET 
    event_name = c.event_name
FROM event_signatures_cache c
WHERE e.event_signature = c.signature
    AND (e.event_name IS NULL OR e.event_name = 'Unknown')
    AND c.event_name != 'Unknown';

-- Mostrar cuántos se actualizaron
\echo ''
\echo '✅ Actualización completada'

COMMIT;

-- ============================================
-- RESULTADO FINAL
-- ============================================

\echo ''
\echo '📈 RESULTADO FINAL'
\echo '======================================'

SELECT 
    'Total de eventos' AS descripcion,
    COUNT(*) AS cantidad
FROM events
UNION ALL
SELECT 
    'Con nombre válido',
    COUNT(*)
FROM events
WHERE event_name IS NOT NULL AND event_name != 'Unknown'
UNION ALL
SELECT 
    'Con Unknown',
    COUNT(*)
FROM events
WHERE event_name = 'Unknown'
UNION ALL
SELECT 
    'Con NULL',
    COUNT(*)
FROM events
WHERE event_name IS NULL;

\echo ''
\echo '⭐ TOP 10 EVENTOS MÁS COMUNES'
\echo '======================================'

SELECT 
    ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) AS rank,
    event_name,
    COUNT(*) AS cantidad
FROM events
WHERE event_name IS NOT NULL AND event_name != 'Unknown'
GROUP BY event_name
ORDER BY cantidad DESC
LIMIT 10;

\echo ''
\echo '🔍 SIGNATURES FALTANTES EN CACHÉ (Top 10)'
\echo '======================================'

SELECT 
    e.event_signature,
    COUNT(*) as eventos_afectados
FROM events e
LEFT JOIN event_signatures_cache c ON e.event_signature = c.signature
WHERE c.signature IS NULL
    AND (e.event_name IS NULL OR e.event_name = 'Unknown')
GROUP BY e.event_signature
ORDER BY eventos_afectados DESC
LIMIT 10;

\echo ''
\echo '✅ Proceso completado'
\echo ''


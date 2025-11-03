-- ⚠️ ADVERTENCIA: Este script eliminará TODOS los datos de la tabla events
-- Solo ejecutar si estás seguro de que quieres eliminar todos los eventos procesados
-- 
-- Para ejecutar este script:
-- psql -h localhost -U postgres -d ethereum_events -f truncate_events.sql
-- 
-- O desde psql:
-- \i truncate_events.sql

-- Mostrar cuántos registros hay antes de truncar
SELECT 'Registros actuales en events:' AS info, COUNT(*) AS total FROM events;

-- Truncar la tabla (elimina todos los datos y reinicia secuencias)
TRUNCATE TABLE events RESTART IDENTITY CASCADE;

-- Confirmar que la tabla está vacía
SELECT 'Registros después de truncar:' AS info, COUNT(*) AS total FROM events;

-- Información adicional
SELECT 'La tabla events ha sido vaciada exitosamente' AS resultado;


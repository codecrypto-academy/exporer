#!/bin/bash

# 🔄 Script para resetear completamente el sistema
# Limpia la base de datos, las colas de RabbitMQ y permite empezar desde cero

set -e  # Salir si hay algún error

echo "🔄 =============================================="
echo "🔄 RESET COMPLETO DEL SISTEMA"
echo "🔄 =============================================="
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Cargar variables de entorno
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo "✅ Variables de entorno cargadas desde .env"
else
    echo "⚠️  Archivo .env no encontrado, usando valores por defecto"
fi

# Variables de PostgreSQL
POSTGRES_HOST=${POSTGRES_HOST:-localhost}
POSTGRES_PORT=${POSTGRES_PORT:-5432}
POSTGRES_USER=${POSTGRES_USER:-postgres}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-mi_contraseña}
POSTGRES_DB=${POSTGRES_DB:-ethereum_events}

# Variables de RabbitMQ
RABBITMQ_HOST=${RABBITMQ_HOST:-localhost}
RABBITMQ_PORT=${RABBITMQ_PORT:-15672}
RABBITMQ_USERNAME=${RABBITMQ_USERNAME:-guest}
RABBITMQ_PASSWORD=${RABBITMQ_PASSWORD:-guest}

echo ""
echo -e "${YELLOW}⚠️  ADVERTENCIA: Esta operación va a:${NC}"
echo "   1. Vaciar TODAS las tablas de la base de datos"
echo "   2. Eliminar TODOS los mensajes de las colas RabbitMQ"
echo "   3. Reiniciar los contadores de ID"
echo ""
echo -e "${RED}   Esta acción NO SE PUEDE DESHACER${NC}"
echo ""
read -p "¿Estás seguro de que quieres continuar? (escribe 'SI' para confirmar): " -r
echo ""

if [[ ! $REPLY =~ ^SI$ ]]; then
    echo "❌ Operación cancelada"
    exit 1
fi

echo ""
echo "=============================================="
echo "📊 PASO 1: LIMPIANDO BASE DE DATOS"
echo "=============================================="
echo ""

# Mostrar conteo actual
echo "📈 Conteo actual de registros:"
export PGPASSWORD=$POSTGRES_PASSWORD
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB << EOF
SELECT 'events' AS tabla, COUNT(*) AS registros FROM events
UNION ALL
SELECT 'consumer_metrics' AS tabla, COUNT(*) AS registros FROM consumer_metrics
UNION ALL
SELECT 'system_metrics' AS tabla, COUNT(*) AS registros FROM system_metrics
UNION ALL
SELECT 'rpcs' AS tabla, COUNT(*) AS registros FROM rpcs;
EOF

echo ""
echo "🗑️  Truncando tablas..."

# Truncar tablas (preserva RPCs y cache de signatures)
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB << EOF
-- Truncar tabla de eventos
TRUNCATE TABLE events RESTART IDENTITY CASCADE;

-- Truncar tabla de métricas de consumidores
TRUNCATE TABLE consumer_metrics RESTART IDENTITY CASCADE;

-- Truncar tabla de métricas del sistema
TRUNCATE TABLE system_metrics RESTART IDENTITY CASCADE;

-- Reiniciar el campo 'in_use' de RPCs
UPDATE rpcs SET in_use = false WHERE in_use = true;

-- NOTA: NO se limpia event_signatures_cache para mantener el caché persistente
-- Si quieres limpiarla también, descomenta la siguiente línea:
-- TRUNCATE TABLE event_signatures_cache RESTART IDENTITY CASCADE;

-- Mostrar resultado
SELECT 
    'events' AS tabla, 
    COUNT(*) AS registros_restantes 
FROM events
UNION ALL
SELECT 
    'consumer_metrics' AS tabla, 
    COUNT(*) AS registros_restantes 
FROM consumer_metrics
UNION ALL
SELECT 
    'system_metrics' AS tabla, 
    COUNT(*) AS registros_restantes 
FROM system_metrics;

-- Confirmar RPCs disponibles
SELECT 
    COUNT(*) as total_rpcs,
    SUM(CASE WHEN active = true THEN 1 ELSE 0 END) as rpcs_activos,
    SUM(CASE WHEN in_use = true THEN 1 ELSE 0 END) as rpcs_en_uso
FROM rpcs;
EOF

echo ""
echo -e "${GREEN}✅ Base de datos limpiada exitosamente${NC}"

echo ""
echo "=============================================="
echo "🐰 PASO 2: LIMPIANDO COLAS DE RABBITMQ"
echo "=============================================="
echo ""

echo "🔍 Verificando conexión a RabbitMQ..."

# Verificar si RabbitMQ está disponible
if curl -s -u $RABBITMQ_USERNAME:$RABBITMQ_PASSWORD http://$RABBITMQ_HOST:$RABBITMQ_PORT/api/overview > /dev/null; then
    echo "✅ RabbitMQ está accesible"
    echo ""
    
    # Nombres de las colas
    QUEUE_MAIN="ethereum_blocks_queue"
    QUEUE_RETRY="ethereum_blocks_retry_queue"
    QUEUE_DLQ="ethereum_blocks_dead_letter_queue"
    
    # Función para limpiar una cola
    purge_queue() {
        local queue_name=$1
        echo "🗑️  Limpiando cola: $queue_name"
        
        # Verificar si la cola existe
        if curl -s -u $RABBITMQ_USERNAME:$RABBITMQ_PASSWORD \
            http://$RABBITMQ_HOST:$RABBITMQ_PORT/api/queues/%2F/$queue_name > /dev/null 2>&1; then
            
            # Purgar la cola
            curl -s -u $RABBITMQ_USERNAME:$RABBITMQ_PASSWORD \
                -X DELETE \
                http://$RABBITMQ_HOST:$RABBITMQ_PORT/api/queues/%2F/$queue_name/contents \
                > /dev/null
            
            echo "   ✅ Cola $queue_name purgada"
        else
            echo "   ⚠️  Cola $queue_name no existe (será creada al iniciar el sistema)"
        fi
    }
    
    # Limpiar todas las colas
    purge_queue $QUEUE_MAIN
    purge_queue $QUEUE_RETRY
    purge_queue $QUEUE_DLQ
    
    echo ""
    echo "📊 Estado de las colas:"
    for queue in $QUEUE_MAIN $QUEUE_RETRY $QUEUE_DLQ; do
        messages=$(curl -s -u $RABBITMQ_USERNAME:$RABBITMQ_PASSWORD \
            http://$RABBITMQ_HOST:$RABBITMQ_PORT/api/queues/%2F/$queue 2>/dev/null | \
            grep -o '"messages":[0-9]*' | grep -o '[0-9]*' || echo "0")
        echo "   - $queue: $messages mensajes"
    done
    
    echo ""
    echo -e "${GREEN}✅ Colas de RabbitMQ limpiadas exitosamente${NC}"
else
    echo -e "${RED}❌ No se pudo conectar a RabbitMQ en http://$RABBITMQ_HOST:$RABBITMQ_PORT${NC}"
    echo "   Verifica que RabbitMQ esté ejecutándose: docker-compose ps"
    echo "   O continúa sin limpiar las colas (se limpiarán al procesar mensajes)"
fi

echo ""
echo "=============================================="
echo "📋 PASO 3: VERIFICACIÓN FINAL"
echo "=============================================="
echo ""

echo "✅ Sistema reseteado completamente"
echo ""
echo "📊 Estado actual:"
echo "   - Base de datos: Tablas vacías (excepto RPCs)"
echo "   - RabbitMQ: Colas vacías"
echo "   - RPCs: Todos marcados como disponibles (in_use = false)"
echo ""
echo "🚀 Para comenzar de nuevo:"
echo ""
echo "   1. Iniciar productor:"
echo "      cd backend && npm run start:producer"
echo ""
echo "   2. Iniciar consumidores:"
echo "      cd backend && npm run start:consumer"
echo "      o"
echo "      cd backend && npx ts-node src/scripts/start-multiple-consumers.ts"
echo ""
echo "📝 Configuración actual de bloques:"
echo "   - BLOCKS_PER_MESSAGE: ${BLOCKS_PER_MESSAGE:-10} bloques"
echo "   - ETHEREUM_START_BLOCK: ${ETHEREUM_START_BLOCK:-18000000}"
echo "   - ETHEREUM_END_BLOCK: ${ETHEREUM_END_BLOCK:-18000100}"
echo ""
echo -e "${GREEN}✅ Sistema listo para procesar bloques${NC}"
echo ""


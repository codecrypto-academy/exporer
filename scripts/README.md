# Scripts del Sistema

Este directorio contiene scripts útiles para gestionar el sistema de procesamiento de bloques Ethereum.

## 🔄 reset-system.sh

Script para resetear completamente el sistema y empezar desde cero.

### ¿Qué hace?

1. **Limpia la base de datos PostgreSQL**:
   - Vacía la tabla `events`
   - Vacía la tabla `consumer_metrics`
   - Vacía la tabla `system_metrics`
   - Marca todos los RPCs como disponibles (`in_use = false`)
   - **PRESERVA** la tabla `rpcs` con todos los endpoints configurados

2. **Limpia las colas de RabbitMQ**:
   - Purga `ethereum_blocks_queue`
   - Purga `ethereum_blocks_retry_queue`
   - Purga `ethereum_blocks_dead_letter_queue`

3. **Reinicia contadores**:
   - Reinicia los IDs de secuencia (AUTO_INCREMENT)

### Uso

```bash
# Desde la raíz del proyecto
./scripts/reset-system.sh
```

O:

```bash
# Hacer ejecutable (solo primera vez)
chmod +x scripts/reset-system.sh

# Ejecutar
./scripts/reset-system.sh
```

### Confirmación

El script pedirá confirmación antes de ejecutar. Debes escribir **`SI`** (en mayúsculas) para continuar.

### Requisitos

- Archivo `.env` configurado con las credenciales correctas
- PostgreSQL accesible
- RabbitMQ accesible (opcional, el script continúa si no está disponible)
- Herramientas instaladas: `psql`, `curl`

### Ejemplo de salida

```
🔄 ==============================================
🔄 RESET COMPLETO DEL SISTEMA
🔄 ==============================================

✅ Variables de entorno cargadas desde .env

⚠️  ADVERTENCIA: Esta operación va a:
   1. Vaciar TODAS las tablas de la base de datos
   2. Eliminar TODOS los mensajes de las colas RabbitMQ
   3. Reiniciar los contadores de ID

   Esta acción NO SE PUEDE DESHACER

¿Estás seguro de que quieres continuar? (escribe 'SI' para confirmar): SI

==============================================
📊 PASO 1: LIMPIANDO BASE DE DATOS
==============================================

📈 Conteo actual de registros:
   tabla             | registros
-------------------+----------
 events            |     5432
 consumer_metrics  |       45
 system_metrics    |        1
 rpcs              |       52

🗑️  Truncando tablas...

✅ Base de datos limpiada exitosamente

==============================================
🐰 PASO 2: LIMPIANDO COLAS DE RABBITMQ
==============================================

🔍 Verificando conexión a RabbitMQ...
✅ RabbitMQ está accesible

🗑️  Limpiando cola: ethereum_blocks_queue
   ✅ Cola ethereum_blocks_queue purgada
🗑️  Limpiando cola: ethereum_blocks_retry_queue
   ✅ Cola ethereum_blocks_retry_queue purgada
🗑️  Limpiando cola: ethereum_blocks_dead_letter_queue
   ✅ Cola ethereum_blocks_dead_letter_queue purgada

📊 Estado de las colas:
   - ethereum_blocks_queue: 0 mensajes
   - ethereum_blocks_retry_queue: 0 mensajes
   - ethereum_blocks_dead_letter_queue: 0 mensajes

✅ Colas de RabbitMQ limpiadas exitosamente

==============================================
📋 PASO 3: VERIFICACIÓN FINAL
==============================================

✅ Sistema reseteado completamente

📊 Estado actual:
   - Base de datos: Tablas vacías (excepto RPCs)
   - RabbitMQ: Colas vacías
   - RPCs: Todos marcados como disponibles (in_use = false)

🚀 Para comenzar de nuevo:

   1. Iniciar productor:
      cd backend && npm run start:producer

   2. Iniciar consumidores:
      cd backend && npm run start:consumer
      o
      cd backend && npx ts-node src/scripts/start-multiple-consumers.ts

📝 Configuración actual de bloques:
   - BLOCKS_PER_MESSAGE: 10 bloques
   - ETHEREUM_START_BLOCK: 18000000
   - ETHEREUM_END_BLOCK: 18000100

✅ Sistema listo para procesar bloques
```

### Notas importantes

- ⚠️ **Los RPCs NO se eliminan**, solo se marcan como disponibles
- ⚠️ **Esta operación NO se puede deshacer**
- ✅ Las migraciones de Flyway NO se afectan
- ✅ El esquema de la base de datos permanece intacto
- ✅ Si RabbitMQ no está disponible, el script continúa con advertencia

### Solución de problemas

**Error: psql: command not found**
```bash
# macOS
brew install postgresql

# Ubuntu/Debian
sudo apt-get install postgresql-client
```

**Error: curl: command not found**
```bash
# macOS (curl viene instalado por defecto)

# Ubuntu/Debian
sudo apt-get install curl
```

**Error: No se puede conectar a PostgreSQL**
```bash
# Verificar que PostgreSQL está corriendo
docker-compose ps

# Verificar las credenciales en .env
cat .env | grep POSTGRES
```

**Error: No se puede conectar a RabbitMQ**
```bash
# Verificar que RabbitMQ está corriendo
docker-compose ps

# Verificar el Management UI
open http://localhost:15672
```

### Uso avanzado

**Solo limpiar base de datos (sin RabbitMQ)**

Edita el script y comenta la sección "PASO 2: LIMPIANDO COLAS DE RABBITMQ".

**Solo limpiar RabbitMQ (sin base de datos)**

Edita el script y comenta la sección "PASO 1: LIMPIANDO BASE DE DATOS".

**Cambiar bloques por mensaje**

Edita el archivo `.env` y modifica:
```bash
BLOCKS_PER_MESSAGE=10  # Cambia a 50, 100, etc.
```

Luego ejecuta el reset para aplicar la nueva configuración.


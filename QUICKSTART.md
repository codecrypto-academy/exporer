# 🚀 Guía de Ejecución Paso a Paso

Sigue estos comandos **en orden** para levantar todo el sistema de procesamiento de bloques Ethereum con RabbitMQ.

---

## 📋 Pre-requisitos

✅ Docker y Docker Compose instalados  
✅ Node.js 18+ y npm instalados  
✅ Terminal abierta en la raíz del proyecto

---

## 🔧 PASO 1: Preparar la Red de Docker

Si tienes PostgreSQL existente en Docker:

```bash
# Ver tu contenedor PostgreSQL
docker ps | grep postgres

# Conectarlo a la red del proyecto (reemplaza <nombre_contenedor>)
docker network connect ethereum-network <nombre_contenedor>

# Ejemplo:
# docker network connect ethereum-network my-postgres
```

Si no tienes PostgreSQL, descomenta el servicio en `docker-compose.yml`.

---

## 🐳 PASO 2: Crear Base de Datos (si no existe)

**⚠️ IMPORTANTE**: Flyway NO crea la base de datos, solo las tablas. Debes crearla manualmente.

### Si usas PostgreSQL en Docker:

```bash
# Conectar al contenedor PostgreSQL
docker exec -it my-postgres psql -U postgres

# Dentro de psql, crear la base de datos:
CREATE DATABASE ethereum_events;

# Verificar
\l

# Salir
\q
```

### Si usas PostgreSQL local:

```bash
# Conectar a PostgreSQL
psql -U postgres

# Crear base de datos
CREATE DATABASE ethereum_events;

# Verificar
\l

# Salir
\q
```

---

## 🐳 PASO 3: Levantar Infraestructura (RabbitMQ + Flyway)

```bash
# Desde la raíz del proyecto
cd /Users/joseviejo/2025/cc/PROYECTOS\ TRAINING/91_explorer

# Levantar servicios
docker-compose up -d

# Verificar que están corriendo
docker-compose ps

# Ver logs de RabbitMQ (opcional)
docker-compose logs -f rabbitmq
```

**✅ Verificación RabbitMQ**:
- Management UI: http://localhost:15672
  - Usuario: `guest`
  - Contraseña: `guest`

**✅ Verificar Flyway (migraciones)**:

```bash
# Ver logs de Flyway (ejecuta migraciones automáticamente)
docker-compose logs flyway
```

Deberías ver:
```
Successfully applied 4 migrations
- V1__create_rpcs_table.sql
- V2__create_events_table.sql
- V3__create_consumer_metrics_table.sql
- V4__create_system_metrics_table.sql
```

**Verificar tablas creadas en PostgreSQL**:

```bash
# Conectar a PostgreSQL
psql -h localhost -U postgres -d ethereum_events

# Listar tablas
\dt

# Deberías ver:
# - rpcs
# - events
# - consumer_metrics
# - system_metrics
# - flyway_schema_history

# Salir
\q
```

**❌ Si Flyway falló**:

```bash
# Ejecutar Flyway manualmente
docker-compose run flyway migrate

# Ver detalles del error
docker-compose logs flyway
```

---

## 📦 PASO 4: Instalar Dependencias del Backend

```bash
# Ir al directorio backend
cd backend

# Instalar dependencias
npm install

# Compilar TypeScript (opcional, para verificar)
npm run build
```

---

## ⚙️ PASO 5: Configurar Variables de Entorno

Crear archivo `.env` en `backend/`:

```bash
# Crear archivo .env

```

**⚠️ IMPORTANTE**: Ajusta `POSTGRES_HOST` según tu caso:
- Si PostgreSQL está en Docker en la red: usa el nombre del contenedor
- Si está en localhost: usa `host.docker.internal` (Mac/Windows) o `172.17.0.1` (Linux)

---

## 🗄️ PASO 6: Cargar RPCs Iniciales

```bash
# Asegúrate de estar en backend/
cd backend

# Cargar RPCs a la base de datos
npm run load-rpcs
```

**✅ Verificación**: Deberías ver un mensaje indicando cuántos RPCs se cargaron.

---

## 🎯 PASO 7: Probar Conexiones (Opcional pero Recomendado)

```bash
# Iniciar backend en modo desarrollo
npm run dev
```

Deberías ver:
```
✅ Configuración validada
✅ Conexión a base de datos establecida
✅ Conexión a RabbitMQ establecida correctamente
✅ Sistema inicializado correctamente
```

**Presiona Ctrl+C para detener** y continuar con el siguiente paso.

---

## 📤 PASO 8: Ejecutar el Productor (Genera Mensajes)

En una **terminal nueva** (Terminal 1):

```bash
cd /Users/joseviejo/2025/cc/PROYECTOS\ TRAINING/91_explorer/backend

# Ejecutar productor

```

**¿Qué hace?**  
Genera mensajes de rangos de bloques y los envía a la cola `ethereum.blocks.queue` en RabbitMQ.

**✅ Verificación**:
- Verás logs: `📤 Enviados X/Y mensajes`
- Consulta http://localhost:15672 → Queues → `ethereum_blocks_queue` debería tener mensajes

**Deja esta terminal abierta** o ciérrala cuando termine (el productor termina automáticamente).

---

## 👷 PASO 9: Ejecutar Consumidores (Procesa Mensajes)

### Opción A: Un Solo Consumidor (para testing)

En una **terminal nueva** (Terminal 2):

```bash
cd /Users/joseviejo/2025/cc/PROYECTOS\ TRAINING/91_explorer/backend

# Ejecutar consumidor
npm run start:consumer
```

### Opción B: Múltiples Consumidores (recomendado)

En una **terminal nueva** (Terminal 2):

```bash
cd /Users/joseviejo/2025/cc/PROYECTOS\ TRAINING/91_explorer/backend

# Ejecutar múltiples workers (según WORKER_INSTANCES en .env)
npx ts-node src/scripts/start-multiple-consumers.ts
```

**¿Qué hace?**  
Los consumidores toman mensajes de la cola, obtienen logs de Ethereum via RPCs, decodifican eventos y los guardan en PostgreSQL.

**✅ Verificación**:
- Verás logs: `🚀 Iniciando consumidor: consumer-xxxxx`
- Verás logs: `✅ consumer-xxxxx completó bloques X-Y (N eventos, Xs)`
- Los mensajes en RabbitMQ deberían disminuir

**Deja esta terminal abierta** para ver el progreso en tiempo real.

---

## 📊 PASO 10: Verificar Resultados

### Verificar en RabbitMQ
```bash
# Abrir en navegador
open http://localhost:15672
```
- Usuario: `guest`, Contraseña: `guest`
- Ve a **Queues** → verifica que los mensajes se están procesando

### Verificar en PostgreSQL

```bash
# Conectar a PostgreSQL (ajusta credenciales)
psql -h localhost -U postgres -d ethereum_events

# Consultas útiles:
SELECT COUNT(*) FROM events;
SELECT COUNT(*) FROM consumer_metrics;
SELECT COUNT(*) FROM rpcs WHERE active = true;
SELECT * FROM consumer_metrics ORDER BY created_at DESC LIMIT 10;
```

O usa tu cliente SQL favorito (DBeaver, pgAdmin, etc.).

---

## 🎬 PASO 11: Ejecutar Frontend (Opcional - Panel Web)

En una **terminal nueva** (Terminal 3):

```bash
cd /Users/joseviejo/2025/cc/PROYECTOS\ TRAINING/91_explorer/web

# Instalar dependencias (solo primera vez)
npm install

# Ejecutar panel web
npm run dev
```

**✅ Acceder**: http://localhost:3000

Verás:
- Dashboard con métricas del sistema
- Tabla de consumidores activos
- Gestión de RPCs

---

## 🔄 Resumen de Terminales Activas

| Terminal | Comando | Descripción |
|----------|---------|-------------|
| Terminal 1 | `npm run start:producer` | Genera mensajes (termina automáticamente) |
| Terminal 2 | `npx ts-node src/scripts/start-multiple-consumers.ts` | Procesa bloques (corre indefinidamente) |
| Terminal 3 | `npm run dev` (en web/) | Panel web (opcional, corre indefinidamente) |

---

## 🛑 Detener Todo

```bash
# Detener consumidores: Ctrl+C en Terminal 2
# Detener frontend: Ctrl+C en Terminal 3

# Detener Docker
cd /Users/joseviejo/2025/cc/PROYECTOS\ TRAINING/91_explorer
docker-compose down

# Para limpiar todo (incluyendo volúmenes)
docker-compose down -v
```

---

## 🔧 Solución de Problemas

### ❌ Error: "Cannot connect to RabbitMQ"
```bash
# Verificar que RabbitMQ está corriendo
docker-compose ps

# Ver logs de RabbitMQ
docker-compose logs rabbitmq

# Reiniciar RabbitMQ
docker-compose restart rabbitmq
```

### ❌ Error: "Cannot connect to PostgreSQL"
```bash
# Verificar que PostgreSQL está corriendo
docker ps | grep postgres

# Verificar variables de entorno en .env
cat backend/.env | grep POSTGRES

# Si usas PostgreSQL en Docker, asegúrate de que está en la red
docker network inspect ethereum-network

# Verificar que la base de datos existe
psql -h localhost -U postgres -l | grep ethereum_events
```

### ❌ Error: "Flyway failed" o tablas no existen
```bash
# Ver logs de Flyway
docker-compose logs flyway

# Verificar que la BD existe primero
psql -h localhost -U postgres -c "\l" | grep ethereum_events

# Si la BD no existe, créala:
psql -h localhost -U postgres -c "CREATE DATABASE ethereum_events;"

# Ejecutar migraciones manualmente
docker-compose run flyway migrate

# Ver estado de migraciones
docker-compose run flyway info

# Verificar tablas creadas
psql -h localhost -U postgres -d ethereum_events -c "\dt"
```

### ❌ Error: "No RPCs disponibles"
```bash
# Cargar RPCs nuevamente
cd backend
npm run load-rpcs

# Verificar en BD
psql -h localhost -U postgres -d ethereum_events -c "SELECT COUNT(*) FROM rpcs WHERE active = true;"
```

### ❌ Los consumidores no procesan mensajes
```bash
# Verificar que hay mensajes en la cola
# http://localhost:15672 → Queues

# Reiniciar consumidores
# Ctrl+C y volver a ejecutar npm run start:consumer
```

---

## 📈 Flujo Completo Resumido

```
1. Conectar PostgreSQL a red      → docker network connect ethereum-network <postgres>
2. Crear BD manualmente           → CREATE DATABASE ethereum_events;
3. docker-compose up -d           → Levanta RabbitMQ + Flyway (crea tablas)
4. npm install                    → Instala dependencias backend
5. Crear .env                     → Configura variables
6. npm run load-rpcs              → Carga RPCs a BD
7. npm run start:producer         → Genera mensajes → RabbitMQ
8. npm run start:consumer         → Procesa mensajes → PostgreSQL
9. (Opcional) npm run dev (web)   → Panel de monitoreo
```

---

## ✅ Checklist de Verificación

- [ ] PostgreSQL está conectado a la red `ethereum-network`
- [ ] Base de datos `ethereum_events` existe
- [ ] RabbitMQ está corriendo (http://localhost:15672)
- [ ] Flyway ejecutó las 4 migraciones correctamente
- [ ] Tablas creadas: `rpcs`, `events`, `consumer_metrics`, `system_metrics`
- [ ] Backend `npm install` completado
- [ ] Archivo `.env` creado y configurado
- [ ] RPCs cargados en BD (mínimo 50+ RPCs)
- [ ] Productor generó mensajes en RabbitMQ
- [ ] Consumidores están procesando
- [ ] Eventos aparecen en tabla `events`

---

## 🎓 Comandos de Referencia Rápida

```bash
# ===== DOCKER =====
# Ver servicios Docker
docker-compose ps

# Ver logs
docker-compose logs -f rabbitmq
docker-compose logs flyway

# Reiniciar todo
docker-compose restart

# Limpiar y reiniciar desde cero
docker-compose down -v
docker-compose up -d

# ===== POSTGRESQL =====
# Crear base de datos
psql -h localhost -U postgres -c "CREATE DATABASE ethereum_events;"

# Listar bases de datos
psql -h localhost -U postgres -l

# Conectar y ver tablas
psql -h localhost -U postgres -d ethereum_events -c "\dt"

# Ver métricas
psql -h localhost -U postgres -d ethereum_events \
  -c "SELECT status, COUNT(*) FROM consumer_metrics GROUP BY status;"

# ===== FLYWAY =====
# Ejecutar migraciones
docker-compose run flyway migrate

# Ver estado de migraciones
docker-compose run flyway info

# Ver logs de Flyway
docker-compose logs flyway

# Validar migraciones
docker-compose run flyway validate

# ===== RABBITMQ =====
# Ver Management UI (navegador)
open http://localhost:15672

# Verificar colas desde Management UI:
# - ethereum_blocks_queue
# - ethereum_blocks_retry_queue
# - ethereum_blocks_dead_letter_queue

# ===== BACKEND =====
# Cargar RPCs
cd backend && npm run load-rpcs

# Probar conexiones
cd backend && npm run dev

# Iniciar productor
cd backend && npm run start:producer

# Iniciar consumidor
cd backend && npm run start:consumer

# Iniciar múltiples consumidores
cd backend && npx ts-node src/scripts/start-multiple-consumers.ts
```

---

¡Listo! 🎉 Ahora tienes el sistema completo de procesamiento de bloques Ethereum funcionando con RabbitMQ.


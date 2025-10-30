## Guía Rápida para Estudiantes

Objetivo: levantar la infraestructura, preparar el backend y ejecutar el productor/consumidores para procesar bloques de Ethereum usando ActiveMQ.

### 1) Requisitos
- Docker y Docker Compose
- Node.js 18+ y npm

### 2) Clonar e instalar
```bash
git clone <repo>
cd 91_explorer
cd backend && npm install
```

### 3) Variables de entorno
Crear el fichero `.env` en `backend/` (puedes copiar desde `.env.example` si existe) con al menos:
```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=mi_contraseña
POSTGRES_DB=ethereum_events

ACTIVEMQ_URL=ws://localhost:61614
ACTIVEMQ_HOST=localhost
ACTIVEMQ_PORT=61614
ACTIVEMQ_USERNAME=guest
ACTIVEMQ_PASSWORD=guest

ETHEREUM_START_BLOCK=18000000
ETHEREUM_END_BLOCK=18001000
BLOCKS_PER_MESSAGE=100

WORKER_INSTANCES=5
MAX_RETRIES=3
RETRY_DELAY_MS=5000
```

### 4) Levantar infraestructura (PostgreSQL + ActiveMQ + Flyway)
Desde la raíz del proyecto (`91_explorer/`):
```bash
docker-compose up -d
```
- PostgreSQL: `localhost:5432`
- ActiveMQ Web Console: `http://localhost:8161` (admin/admin)

### 5) Preparar base de datos y datos iniciales
```bash
cd backend
npm run load-rpcs
```

### 6) Ejecutar backend
- Modo desarrollo (inicialización y conexiones):
```bash
npm run dev
```

### 7) Ejecutar Productor y Consumidores
- Productor (genera mensajes de rangos de bloques en ActiveMQ):
```bash
npm run start:producer
```
- Un consumidor (procesa mensajes):
```bash
npm run start:consumer
```
- Múltiples consumidores (según `WORKER_INSTANCES`):
```bash
ts-node src/scripts/start-multiple-consumers.ts
```

### 8) Verificación rápida
- ActiveMQ (Web): `http://localhost:8161` → verifica colas:
  - `ethereum.blocks.queue`
  - `ethereum.blocks.retry.queue`
  - `ethereum.blocks.deadletter.queue`
- Logs en consola del productor/consumidores
- Tablas en PostgreSQL (`events`, `consumer_metrics`, `system_metrics`, `rpcs`)

### 9) Estructura útil
- `backend/src/config/activemq.ts`: cliente STOMP de ActiveMQ
- `backend/src/queue/producer.ts`: envía mensajes de bloques
- `backend/src/queue/consumer.ts`: consume y procesa eventos
- `backend/src/services/*`: lógica de blockchain y decodificación

### 10) Problemas comunes (y soluciones)
- No conecta a ActiveMQ:
  - Asegúrate de `docker-compose up -d` y que la consola `http://localhost:8161` esté accesible
  - Revisa `.env` (`ACTIVEMQ_*`)
- No se crean mensajes:
  - Revisa rangos `ETHEREUM_START_BLOCK`/`ETHEREUM_END_BLOCK`
  - Ejecuta de nuevo el productor
- Consumers sin progreso:
  - Verifica que hay RPCs activos en BD (`rpcs`)
  - Revisa logs de `consumer.ts` y conexión a RPCs

### 11) Limpieza y reinicio
```bash
docker-compose down -v
docker-compose up -d
```

Listo. Con esto deberías poder levantar el stack, producir trabajos y consumirlos para guardar eventos en PostgreSQL usando ActiveMQ.



# Ethereum Block Processor - Backend

Sistema backend para procesamiento distribuido de bloques de Ethereum utilizando RabbitMQ, PostgreSQL y Ethers.js.

## Instalación

```bash
npm install
```

## Configuración

1. Copia `.env.example` a `.env` y configura las variables
2. Asegúrate de que PostgreSQL y RabbitMQ estén corriendo (usa Docker Compose)

## Scripts Disponibles

### Desarrollo
```bash
npm run dev              # Iniciar en modo desarrollo
npm run build            # Compilar TypeScript a JavaScript
npm start                # Iniciar en producción (requiere build)
```

### Operaciones del Sistema

#### 1. Cargar RPCs desde JSON
```bash
npm run load-rpcs
```
Carga todos los RPCs desde `logs-eth/rpcs.json` a la base de datos.

#### 2. Iniciar Productor
```bash
npm run start:producer
```
Genera mensajes con rangos de bloques y los envía a RabbitMQ.

#### 3. Iniciar Consumidor (Worker)
```bash
npm run start:consumer
```
Inicia un solo consumidor que procesa bloques de la cola.

#### 4. Iniciar Múltiples Consumidores
```bash
ts-node src/scripts/start-multiple-consumers.ts
```
Inicia múltiples consumidores en paralelo (cantidad configurada en `WORKER_INSTANCES`).

## Flujo de Trabajo Completo

1. **Iniciar infraestructura**:
   ```bash
   docker-compose up -d
   ```

2. **Ejecutar migraciones** (automático con docker-compose, o manualmente):
   ```bash
   docker-compose run flyway migrate
   ```

3. **Cargar RPCs**:
   ```bash
   npm run load-rpcs
   ```

4. **Generar mensajes** (en una terminal):
   ```bash
   npm run start:producer
   ```

5. **Iniciar consumidores** (en otra terminal):
   ```bash
   ts-node src/scripts/start-multiple-consumers.ts
   ```

## Estructura del Proyecto

```
backend/
├── src/
│   ├── config/           # Configuración (DB, RabbitMQ, env)
│   ├── database/
│   │   └── models/       # Modelos de datos (RPC, Event, Metrics)
│   ├── services/         # Servicios (Blockchain, Decoder)
│   ├── queue/            # Productor y Consumidor
│   ├── utils/            # Utilidades (Logger)
│   ├── scripts/          # Scripts ejecutables
│   └── index.ts          # Punto de entrada principal
├── logs/                 # Logs de la aplicación
├── package.json
└── tsconfig.json
```

## Características Implementadas

- ✅ Pool dinámico de RPCs con asignación exclusiva
- ✅ Sistema de colas con RabbitMQ (cola principal + reintentos + dead letter)
- ✅ Procesamiento paralelo con múltiples workers
- ✅ Decodificación de eventos usando 4byte.directory
- ✅ Tolerancia a fallos con reintentos automáticos
- ✅ Métricas detalladas por consumidor y globales
- ✅ Logging estructurado con Winston
- ✅ TypeScript con tipado estricto

## Métricas y Monitoreo

Las métricas se almacenan en PostgreSQL:

- **consumer_metrics**: Métricas individuales por ejecución
- **system_metrics**: Métricas agregadas del sistema
- **events**: Todos los eventos procesados
- **rpcs**: Estado de los RPCs

## Manejo de Errores

El sistema incluye:

- Reintentos automáticos en caso de fallos
- Cola de dead letter para mensajes que fallan repetidamente
- Logs detallados de errores con stack traces
- Métricas de errores por consumidor

## Variables de Entorno Principales

```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=mi_contraseña
POSTGRES_DB=ethereum_events

RABBITMQ_URL=amqp://guest:guest@localhost:5672

ETHEREUM_START_BLOCK=18000000
ETHEREUM_END_BLOCK=18001000
BLOCKS_PER_MESSAGE=100

WORKER_INSTANCES=5
MAX_RETRIES=3
```

## Desarrollo

```bash
npm run dev              # Modo watch con ts-node-dev
npm run lint             # Lint con ESLint
npm run format           # Format con Prettier
npm test                 # Ejecutar tests
```

## Troubleshooting

### Error de conexión a PostgreSQL
- Verificar que el contenedor esté corriendo: `docker-compose ps`
- Verificar credenciales en `.env`

### Error de conexión a RabbitMQ
- Verificar que RabbitMQ esté corriendo: `docker-compose ps`
- Acceder a la UI de management: http://localhost:15672

### No hay RPCs disponibles
- Ejecutar `npm run load-rpcs` para cargar RPCs desde JSON
- Verificar RPCs activos en la base de datos

### Los consumidores no procesan mensajes
- Verificar que haya mensajes en la cola
- Ejecutar el productor: `npm run start:producer`
- Verificar logs de los consumidores

## Licencia

ISC

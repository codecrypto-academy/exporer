# Estructura del Proyecto - Sistema de Procesamiento de Bloques Ethereum

## Estructura Actual del Proyecto

```
91_explorer/
├── .claude_code_permissions.json   # Permisos para Claude Code
├── .env.example                     # Plantilla de variables de entorno
├── README.md                        # Documentación principal del sistema
├── logs-eth/                        # Código existente (procesamiento básico)
│   ├── index.ts                     # Archivo principal
│   ├── package.json                 # Dependencias (ethers.js)
│   ├── rpcs.json                    # Lista de RPCs de Ethereum
│   ├── update-rpcs.tsx              # Script para actualizar RPCs
│   └── verLog.ts                    # Verificación de logs
└── [PENDIENTE] Estructura completa
```

## Estructura Propuesta para el Proyecto Completo

```
91_explorer/
├── .env.example                     # ✅ CREADO
├── .claude_code_permissions.json    # ✅ CREADO
├── README.md                        # ✅ EXISTENTE
├── docker-compose.yml               # ⏳ Docker: PostgreSQL + RabbitMQ
│
├── backend/                         # Sistema de colas y procesamiento
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts          # Configuración PostgreSQL
│   │   │   ├── rabbitmq.ts          # Configuración RabbitMQ
│   │   │   └── environment.ts       # Variables de entorno
│   │   ├── database/
│   │   │   ├── migrations/          # Migraciones Flyway
│   │   │   │   ├── V1__create_rpcs_table.sql
│   │   │   │   ├── V2__create_events_table.sql
│   │   │   │   ├── V3__create_metrics_table.sql
│   │   │   │   └── V4__create_consumer_metrics_table.sql
│   │   │   └── models/
│   │   │       ├── Event.ts
│   │   │       ├── RPC.ts
│   │   │       ├── Metric.ts
│   │   │       └── ConsumerMetric.ts
│   │   ├── services/
│   │   │   ├── rpc-pool.ts          # Gestión del pool de RPCs
│   │   │   ├── blockchain.ts        # Interacción con Ethereum (Ethers.js)
│   │   │   ├── decoder.ts           # Decodificación 4byte.directory
│   │   │   └── metrics.ts           # Registro de métricas
│   │   ├── queue/
│   │   │   ├── producer.ts          # Productor de mensajes
│   │   │   └── consumer.ts          # Consumidor/Worker
│   │   ├── utils/
│   │   │   ├── logger.ts            # Sistema de logging
│   │   │   └── retry.ts             # Sistema de reintentos
│   │   └── index.ts                 # Punto de entrada
│   └── scripts/
│       ├── start-producer.ts        # Iniciar productor
│       ├── start-consumer.ts        # Iniciar consumidor
│       └── load-rpcs.ts             # Cargar RPCs desde JSON
│
├── web/                             # Panel de control Next.js
│   ├── package.json
│   ├── next.config.js
│   ├── tsconfig.json
│   ├── public/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx             # Dashboard principal
│   │   │   ├── rpcs/
│   │   │   │   └── page.tsx         # Gestión de RPCs
│   │   │   └── metrics/
│   │   │       └── page.tsx         # Métricas y visualización
│   │   ├── components/
│   │   │   ├── Dashboard/
│   │   │   │   ├── MetricsCard.tsx
│   │   │   │   ├── ProgressChart.tsx
│   │   │   │   └── ConsumersTable.tsx
│   │   │   ├── RPCs/
│   │   │   │   ├── RPCList.tsx
│   │   │   │   └── RPCToggle.tsx
│   │   │   └── Metrics/
│   │   │       ├── PerformanceChart.tsx
│   │   │       └── ErrorsLog.tsx
│   │   ├── lib/
│   │   │   ├── api.ts               # Cliente API
│   │   │   └── websocket.ts         # WebSocket para tiempo real
│   │   └── types/
│   │       └── index.ts
│   └── styles/
│       └── globals.css
│
├── logs-eth/                        # ✅ Código existente
│   ├── rpcs.json                    # ✅ Lista de RPCs
│   └── ...
│
└── flyway/                          # Configuración Flyway
    ├── flyway.conf
    └── sql/
        ├── V1__create_rpcs_table.sql
        ├── V2__create_events_table.sql
        ├── V3__create_metrics_table.sql
        └── V4__create_consumer_metrics_table.sql
```

## Esquema de Base de Datos PostgreSQL

### Tabla: `rpcs`
```sql
CREATE TABLE rpcs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    url TEXT NOT NULL UNIQUE,
    last_block BIGINT,
    last_update TIMESTAMP,
    active BOOLEAN DEFAULT true,
    tested BOOLEAN DEFAULT false,
    execution_time VARCHAR(50),
    registros INTEGER,
    error TEXT,
    in_use BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Tabla: `events`
```sql
CREATE TABLE events (
    id BIGSERIAL PRIMARY KEY,
    block_hash VARCHAR(66) NOT NULL,
    transaction_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    event_name VARCHAR(255),
    event_signature VARCHAR(66) NOT NULL,
    param_1 TEXT,
    param_2 TEXT,
    param_3 TEXT,
    param_4 TEXT,
    param_5 TEXT,
    param_6 TEXT,
    param_7 TEXT,
    param_8 TEXT,
    param_9 TEXT,
    param_10 TEXT,
    param_11 TEXT,
    param_12 TEXT,
    param_13 TEXT,
    param_14 TEXT,
    param_15 TEXT,
    param_16 TEXT,
    param_17 TEXT,
    param_18 TEXT,
    param_19 TEXT,
    param_20 TEXT,
    block_timestamp TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_block_number (block_number),
    INDEX idx_transaction_hash (transaction_hash),
    INDEX idx_event_signature (event_signature)
);
```

### Tabla: `consumer_metrics`
```sql
CREATE TABLE consumer_metrics (
    id SERIAL PRIMARY KEY,
    consumer_id VARCHAR(255) NOT NULL,
    rpc_id INTEGER REFERENCES rpcs(id),
    rpc_url TEXT,
    status VARCHAR(50) NOT NULL, -- 'processing', 'completed', 'failed'
    blocks_processed INTEGER DEFAULT 0,
    events_extracted INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    retry_count INTEGER DEFAULT 0,
    start_block BIGINT,
    end_block BIGINT,
    execution_time_ms BIGINT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP,
    error_message TEXT,
    INDEX idx_consumer_id (consumer_id),
    INDEX idx_status (status)
);
```

### Tabla: `system_metrics`
```sql
CREATE TABLE system_metrics (
    id SERIAL PRIMARY KEY,
    total_blocks_processed BIGINT DEFAULT 0,
    total_events_extracted BIGINT DEFAULT 0,
    total_execution_time_ms BIGINT DEFAULT 0,
    total_consumers_failed INTEGER DEFAULT 0,
    blocks_per_second DECIMAL(10, 2),
    average_execution_time_ms DECIMAL(10, 2),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Stack Tecnológico

### Backend
- **Runtime**: Node.js con TypeScript
- **Base de datos**: PostgreSQL
- **Migraciones**: Flyway
- **Cola de mensajes**: RabbitMQ
- **Blockchain**: Ethers.js v6
- **APIs externas**: 4byte.directory

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Lenguaje**: TypeScript
- **UI**: React
- **Tiempo real**: WebSockets
- **Gráficos**: Recharts / Chart.js

### Infraestructura
- **Contenedores**: Docker + Docker Compose
- **Base de datos**: PostgreSQL 15+
- **Cola**: RabbitMQ 3.12+

## Próximos Pasos (según TODO List)

1. ✅ **Configuración inicial** (COMPLETADO)
   - Fichero de permisos creado
   - Variables de entorno configuradas
   - Estructura del proyecto definida

2. ⏳ **Infraestructura Docker**
   - Crear docker-compose.yml
   - Configurar PostgreSQL
   - Configurar RabbitMQ

3. ⏳ **Base de datos**
   - Configurar Flyway
   - Crear migraciones SQL
   - Cargar RPCs desde logs-eth/rpcs.json

4. ⏳ **Sistema de colas**
   - Implementar productor de mensajes
   - Implementar consumidores/workers
   - Sistema de tolerancia a fallos

5. ⏳ **Integración blockchain**
   - Configurar Ethers.js
   - Implementar decodificación de eventos
   - Integrar 4byte.directory

6. ⏳ **Panel web**
   - Crear proyecto Next.js
   - Implementar dashboard
   - Gestión de RPCs en tiempo real

7. ⏳ **Testing y monitoreo**
   - Sistema de logging
   - Pruebas de integración
   - Monitoreo de errores

## Variables de Entorno Necesarias

Ver `.env.example` para la lista completa de variables de entorno requeridas.

## Comandos de Inicio

```bash
# Iniciar infraestructura
docker-compose up -d

# Ejecutar migraciones
flyway migrate

# Cargar RPCs
npm run load-rpcs

# Iniciar productor
npm run start:producer

# Iniciar consumidores
npm run start:consumer

# Iniciar panel web
cd web && npm run dev
```

## Estructura de Datos del RPC (rpcs.json)

Cada RPC tiene la siguiente estructura:
```json
{
  "name": "Nombre del RPC",
  "url": "https://...",
  "lastBlock": 23654300,
  "date": "2025-10-25T11:53:23.000Z",
  "active": true,
  "tested": true,
  "executionTime": "42.94s",
  "registros": 80212,
  "error": "mensaje de error opcional"
}
```

## Notas Importantes

- El proyecto ya tiene código existente en `logs-eth/`
- Se utiliza Ethers.js v6 (ya instalado)
- Los RPCs están en `logs-eth/rpcs.json` con 50+ endpoints
- El sistema debe soportar procesamiento paralelo masivo
- Se requiere alta tolerancia a fallos

# Ethereum Block Processor - Panel Web

Panel de control web para el sistema de procesamiento de bloques de Ethereum.

## Características

- **Dashboard en Tiempo Real**: Actualización automática cada 5 segundos
- **Métricas Globales**: Bloques procesados, eventos extraídos, velocidad, tasa de éxito
- **Gestión de RPCs**: Activar/desactivar endpoints en tiempo real
- **Tabla de Consumidores**: Monitoreo de workers activos y completados
- **Interfaz Responsive**: Compatible con modo oscuro

## Instalación

```bash
npm install
```

## Configuración

Crea un archivo `.env.local` con las siguientes variables:

```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=mi_contraseña
POSTGRES_DB=ethereum_events
```

## Desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## Producción

```bash
npm run build
npm start
```

## Estructura del Proyecto

```
web/
├── app/
│   ├── api/                    # API Routes
│   │   ├── rpcs/              # Gestión de RPCs
│   │   ├── metrics/           # Métricas del sistema
│   │   ├── consumers/         # Datos de consumidores
│   │   └── events/            # Eventos procesados
│   ├── rpcs/                  # Página de gestión de RPCs
│   ├── page.tsx               # Dashboard principal
│   └── layout.tsx             # Layout global
├── components/
│   ├── dashboard/             # Componentes del dashboard
│   │   ├── stats-card.tsx
│   │   └── consumers-table.tsx
│   └── ui/                    # Componentes de UI reutilizables
│       ├── card.tsx
│       └── badge.tsx
├── lib/
│   └── database.ts            # Cliente PostgreSQL
└── types/
    └── index.ts               # TypeScript types
```

## API Endpoints

### GET /api/metrics/system
Obtiene métricas globales del sistema.

**Response**:
```json
{
  "success": true,
  "data": {
    "totalBlocksProcessed": 1000,
    "totalEventsExtracted": 5000,
    "totalConsumersActive": 5,
    "totalConsumersFailed": 0,
    "blocksPerSecond": 10.5,
    "averageExecutionTime": 5000,
    "successRate": 100
  }
}
```

### GET /api/rpcs
Obtiene la lista de RPCs configurados.

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "LlamaRPC",
      "url": "https://eth.llamarpc.com",
      "active": true,
      "in_use": false,
      "last_block": 23654300
    }
  ]
}
```

### PATCH /api/rpcs
Actualiza el estado de un RPC.

**Request**:
```json
{
  "id": 1,
  "active": false
}
```

### GET /api/consumers?limit=50&status=processing
Obtiene la lista de consumidores.

**Query params**:
- `limit`: Número máximo de resultados (default: 50)
- `status`: Filtrar por estado (processing, completed, failed)

### GET /api/events?limit=100&block=18000000
Obtiene eventos procesados.

**Query params**:
- `limit`: Número máximo de eventos (default: 100)
- `block`: Filtrar por número de bloque

## Características Implementadas

- ✅ Dashboard en tiempo real con auto-refresh
- ✅ Gestión de RPCs (activar/desactivar)
- ✅ Visualización de métricas globales
- ✅ Tabla de consumidores con estado y progreso
- ✅ Interfaz responsive con Tailwind CSS
- ✅ Modo oscuro
- ✅ API Routes en Next.js
- ✅ TypeScript con tipado completo
- ✅ Conexión a PostgreSQL

## Próximas Mejoras

- WebSockets para actualizaciones en tiempo real
- Gráficos de rendimiento (Recharts)
- Página de explorador de eventos
- Filtros avanzados
- Exportación de datos

## Tecnologías

- **Next.js 16** (App Router)
- **React 19**
- **TypeScript**
- **Tailwind CSS 4**
- **PostgreSQL** (vía pg)
- **Lucide React** (iconos)
- **date-fns** (formato de fechas)

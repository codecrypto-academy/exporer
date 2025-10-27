> ⚠️ **ESTADO DEL PROYECTO:**  
> <span style="color:orange"><b>BORRADOR - EN DESARROLLO, NO DEFINITIVO</b></span>

---



# Sistema de Procesamiento de Bloques de Ethereum

## Descripción General
Sistema distribuido para el procesamiento masivo y análisis de bloques de Ethereum, utilizando una arquitectura de colas de mensajes con múltiples consumidores paralelos y almacenamiento persistente de eventos.

## Arquitectura del Sistema

### 1. Sistema de Colas (RabbitMQ) usando docker-compose.
- **Productor**: Genera mensajes con rangos de bloques a procesar
- **Mensajes**: Cada mensaje contiene:
  - Rango de bloques (inicio-fin)
  - Tarea específica a ejecutar por bloque definida con un codigo.
- **Cola de reintentos**: Los mensajes fallidos se reenvían automáticamente

### 2. Pool de RPCs Dinámico
- **Configuración**: Base de datos postgresql con URLs de endpoints RPC de Ethereum que obtenemos de logs-eth/rpcs.json. Las migraciones de la base de datos se haran con flyway.1

```json
   
   {
    "name": "LlamaRPC",
    "url": "https://eth.llamarpc.com",
    "lastBlock": 23654300,
    "date": "2025-10-25T11:53:23.000Z",
    "active": true,
    "tested": true,
    "executionTime": "42.94s"
  }
  ```

- **Gestión desde Web**: 
  - Activar/desactivar RPCs en tiempo real
  - Visualizar estado de cada endpoint
- **Asignación inteligente**: Los consumidores seleccionan automáticamente RPCs disponibles y no utilizados
- **Biblioteca**: Ethers.js para todas las interacciones con la blockchain

### 3. Consumidores (Workers)

#### Características principales:
- **Procesamiento paralelo**: Múltiples consumidores trabajando simultáneamente
- **Tolerancia a fallos**: 
  - Detección automática de errores
  - Reenvío del mensaje a la cola
  - Terminación segura del consumidor fallido
- **Asignación exclusiva de RPC**: Cada consumidor usa un endpoint diferente

#### Flujo de procesamiento por consumidor:
1. **Inicio**: Registro en BD con estado "en proceso"
2. **Procesamiento**: 
   - Obtención de bloques del rango asignado
   - Extracción de transacciones y eventos
   - Decodificación de eventos usando 4byte.directory API
3. **Finalización**: 
   - Estado "finalizado" si completa exitosamente
   - Estado "fallido" si encuentra errores

### 4. Almacenamiento de Datos (PostgreSQL)

#### Tabla de Eventos
Almacena cada evento procesado con la siguiente estructura:
- **Identificadores**: Hash de bloque, hash de transacción
- **Metadatos del evento**: Nombre, signature hexadecimal
- **Parámetros decodificados**: Hasta 20 columnas (param_1 a param_20) para datos del evento
- **Timestamps**: Marca temporal del bloque

#### Tabla de Métricas del Sistema
Registro agregado del proceso completo:
- Total de bloques procesados
- Tiempo total de ejecución
- Número de consumidores fallidos
- Tasa de procesamiento (bloques/segundo)

#### Tabla de Métricas por Consumidor
Registro individual de cada ejecución:
- **Identificación**: ID de consumidor, RPC utilizado
- **Rendimiento**: 
  - Tiempo de ejecución
  - Bloques procesados
  - Eventos extraídos
  - Número de fallos/reintentos
- **Estado**: En proceso / Finalizado / Fallido
- **Timestamps**: Inicio y fin de ejecución

#### Tabla de RPCs
Gestión de endpoints:
- URL del RPC
- Estado (activo/inactivo)
- Métricas de uso y rendimiento
- Última actualización

### 5. Integración con APIs Externas

#### 4byte.directory API
- **Endpoint**: `https://www.4byte.directory/api/v1/event-signatures/`
- **Propósito**: Resolución de signatures hexadecimales a nombres legibles de eventos
- **Uso**: Decodificación automática de eventos de contratos inteligentes

### 6. Panel de Control Web con nextjs.

#### Funcionalidades:
- **Dashboard en tiempo real**:
  - Métricas globales del sistema
  - Progreso del procesamiento de bloques
  - Estado de consumidores activos
  
- **Gestión de RPCs**:
  - Lista de todos los endpoints configurados
  - Toggle activar/desactivar RPCs
  - Métricas de rendimiento por RPC
  
- **Visualización de métricas**:
  - Gráficos de rendimiento histórico
  - Tabla de consumidores con sus estadísticas
  - Logs de errores y fallos
  
- **Monitoreo**:
  - Consumidores activos vs fallidos
  - Velocidad de procesamiento actual
  - Estimación de tiempo restante

## Configuración del Entorno

### Base de Datos PostgreSQL
Para el manejo de migraciones de la basae de datos usaremos flyway.

```bash
docker run -d \
  --name ethereum-processor-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=mi_contraseña \
  -e POSTGRES_DB=ethereum_events \
  -p 5432:5432 \
  postgres:latest
```

### Variables de Entorno Requeridas
- `RABBITMQ_URL`: URL de conexión a RabbitMQ
- `POSTGRES_CONNECTION`: String de conexión a PostgreSQL
- `ETHEREUM_START_BLOCK`: Bloque inicial (x)
- `ETHEREUM_END_BLOCK`: Bloque final (y)
- `WORKER_INSTANCES`: Número de consumidores paralelos

## Flujo de Datos Completo

1. **Inicialización**: Creación de mensajes para rangos de bloques (x → y)
2. **Distribución**: RabbitMQ distribuye mensajes a consumidores disponibles
3. **Procesamiento**: 
   - Consumidor obtiene bloque via RPC exclusivo
   - Extrae transacciones y eventos
   - Decodifica eventos usando 4byte.directory
   - Almacena en PostgreSQL
4. **Monitoreo**: Panel web muestra métricas en tiempo real
5. **Recuperación**: Mensajes fallidos se reencolan automáticamente

## Beneficios del Sistema

- ✅ **Escalabilidad horizontal**: Añade más consumidores según necesidad
- ✅ **Resiliencia**: Manejo automático de fallos y reintentos
- ✅ **Observabilidad**: Métricas detalladas de cada componente
- ✅ **Flexibilidad**: Gestión dinámica de RPCs sin downtime
- ✅ **Trazabilidad**: Registro completo de eventos y transacciones procesadas
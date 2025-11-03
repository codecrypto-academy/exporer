/**
 * Script para reencolar mensajes desde Dead Letter Queue
 * Usa la API HTTP de RabbitMQ Management
 */
import axios from 'axios';
import { config } from '../config/environment';

const RABBITMQ_API = 'http://localhost:15672/api';
const RABBITMQ_USER = 'guest';
const RABBITMQ_PASSWORD = 'guest';

async function requeueMessages() {
  try {
    console.log('\n🔄 REENCOLAR MENSAJES DESDE DEAD LETTER QUEUE\n');
    console.log('═'.repeat(60));

    // 1. Obtener información de las colas
    const queuesResponse = await axios.get(
      `${RABBITMQ_API}/queues`,
      { auth: { username: RABBITMQ_USER, password: RABBITMQ_PASSWORD } }
    );

    const dlQueue = queuesResponse.data.find((q: any) => 
      q.name === config.rabbitmq.queues.deadLetter
    );
    
    if (!dlQueue) {
      console.log('❌ No se encontró la Dead Letter Queue\n');
      process.exit(1);
    }

    const dlqCount = dlQueue.messages || 0;
    console.log(`\n📬 Mensajes en Dead Letter Queue: ${dlqCount}`);

    if (dlqCount === 0) {
      console.log('✅ No hay mensajes para reencolar\n');
      process.exit(0);
    }

    console.log(`\n⚠️  Estos mensajes fallaron múltiples veces anteriormente`);
    console.log(`   Los vamos a mover de vuelta a la cola principal\n`);

    console.log('🔄 Reencolando mensajes...\n');

    let requeuedCount = 0;
    
    // 2. Obtener mensajes de DLQ y publicarlos en la cola principal
    for (let i = 0; i < dlqCount; i++) {
      try {
        // Obtener un mensaje de DLQ
        const getResponse = await axios.post(
          `${RABBITMQ_API}/queues/%2F/${config.rabbitmq.queues.deadLetter}/get`,
          {
            count: 1,
            ackmode: 'ack_requeue_false',
            encoding: 'auto'
          },
          { auth: { username: RABBITMQ_USER, password: RABBITMQ_PASSWORD } }
        );

        if (getResponse.data && getResponse.data.length > 0) {
          const message = getResponse.data[0];
          const payload = message.payload;
          
          // Publicar en la cola principal
          await axios.post(
            `${RABBITMQ_API}/exchanges/%2F/amq.default/publish`,
            {
              properties: {},
              routing_key: config.rabbitmq.queues.blocks,
              payload: payload,
              payload_encoding: 'string'
            },
            { auth: { username: RABBITMQ_USER, password: RABBITMQ_PASSWORD } }
          );

          requeuedCount++;
          
          if (requeuedCount % 10 === 0) {
            console.log(`   ✅ Reencolados: ${requeuedCount}/${dlqCount}`);
          }
        }
      } catch (error: any) {
        console.error(`   ❌ Error al reencolar mensaje ${i + 1}:`, error.message);
      }
    }

    console.log(`\n✅ Total reencolado: ${requeuedCount} de ${dlqCount} mensajes`);
    console.log(`\n💡 Los consumidores procesarán estos mensajes ahora\n`);

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

requeueMessages();


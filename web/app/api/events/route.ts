import { NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { Event } from '@/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    
    // Filtros
    const blockNumber = searchParams.get('block');
    const txHash = searchParams.get('tx');
    const contractAddress = searchParams.get('contract');
    const eventName = searchParams.get('event');

    let queryText = `SELECT * FROM events`;
    const params: any[] = [];
    const conditions: string[] = [];

    // Aplicar filtros
    if (blockNumber) {
      params.push(parseInt(blockNumber, 10));
      conditions.push(`block_number = $${params.length}`);
    }

    if (txHash) {
      params.push(txHash.toLowerCase());
      conditions.push(`LOWER(transaction_hash) = $${params.length}`);
    }

    if (contractAddress) {
      params.push(contractAddress.toLowerCase());
      conditions.push(`LOWER(contract_address) = $${params.length}`);
    }

    if (eventName) {
      params.push(`%${eventName}%`);
      conditions.push(`event_name ILIKE $${params.length}`);
    }

    if (conditions.length > 0) {
      queryText += ` WHERE ${conditions.join(' AND ')}`;
    }

    queryText += ` ORDER BY block_number DESC, log_index DESC`;
    
    // Añadir paginación
    params.push(limit);
    queryText += ` LIMIT $${params.length}`;
    
    params.push(offset);
    queryText += ` OFFSET $${params.length}`;

    const result = await query(queryText, params);
    const events: Event[] = result.rows;

    // Obtener estadísticas con los mismos filtros
    let statsQueryText = `
      SELECT
        COUNT(*) as total_events,
        MIN(block_number) as min_block,
        MAX(block_number) as max_block,
        COUNT(DISTINCT contract_address) as unique_contracts
      FROM events
    `;

    const statsConditions = conditions.slice(); // Copiar condiciones
    if (statsConditions.length > 0) {
      statsQueryText += ` WHERE ${statsConditions.join(' AND ')}`;
    }

    const statsParams = params.slice(0, conditions.length); // Solo los parámetros de filtros
    const statsResult = await query(statsQueryText, statsParams);
    const stats = statsResult.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        events,
        stats: {
          total: parseInt(stats.total_events, 10),
          minBlock: stats.min_block,
          maxBlock: stats.max_block,
          uniqueContracts: parseInt(stats.unique_contracts, 10),
        },
        pagination: {
          limit,
          offset,
          hasMore: events.length === limit,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

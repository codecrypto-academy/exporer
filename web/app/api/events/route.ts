import { NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { Event } from '@/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const blockNumber = searchParams.get('block');

    let queryText = `
      SELECT * FROM events
    `;

    const params: any[] = [];

    if (blockNumber) {
      queryText += ` WHERE block_number = $1`;
      params.push(parseInt(blockNumber, 10));
    }

    queryText += ` ORDER BY block_number DESC, log_index DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await query(queryText, params);
    const events: Event[] = result.rows;

    // Obtener estadísticas
    const statsQuery = `
      SELECT
        COUNT(*) as total_events,
        MIN(block_number) as min_block,
        MAX(block_number) as max_block
      FROM events
    `;

    const statsResult = await query(statsQuery);
    const stats = statsResult.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        events,
        stats: {
          total: parseInt(stats.total_events, 10),
          minBlock: stats.min_block,
          maxBlock: stats.max_block,
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

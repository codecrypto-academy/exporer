import { NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ConsumerMetric } from '@/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const status = searchParams.get('status');

    let queryText = `
      SELECT * FROM consumer_metrics
    `;

    const params: any[] = [];
    if (status) {
      queryText += ` WHERE status = $1`;
      params.push(status);
    }

    queryText += ` ORDER BY started_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await query(queryText, params);
    const consumers: ConsumerMetric[] = result.rows;

    return NextResponse.json({
      success: true,
      data: consumers,
    });
  } catch (error) {
    console.error('Error fetching consumers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch consumers' },
      { status: 500 }
    );
  }
}

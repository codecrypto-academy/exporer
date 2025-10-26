import { NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { RPC } from '@/types';

export async function GET() {
  try {
    const result = await query('SELECT * FROM rpcs ORDER BY name');
    const rpcs: RPC[] = result.rows;

    return NextResponse.json({
      success: true,
      data: rpcs,
    });
  } catch (error) {
    console.error('Error fetching RPCs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch RPCs' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, active } = await request.json();

    if (!id || active === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await query('UPDATE rpcs SET active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [
      active,
      id,
    ]);

    return NextResponse.json({
      success: true,
      message: 'RPC status updated',
    });
  } catch (error) {
    console.error('Error updating RPC:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update RPC' },
      { status: 500 }
    );
  }
}

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

export async function POST(request: Request) {
  try {
    const { name, url } = await request.json();

    if (!name || !url) {
      return NextResponse.json(
        { success: false, error: 'Name and URL are required' },
        { status: 400 }
      );
    }

    // Verificar si ya existe
    const existing = await query('SELECT id FROM rpcs WHERE url = $1 OR name = $2', [url, name]);
    
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'RPC with this name or URL already exists' },
        { status: 400 }
      );
    }

    // Insertar nuevo RPC
    const result = await query(
      'INSERT INTO rpcs (name, url, active, tested, in_use) VALUES ($1, $2, true, false, false) RETURNING *',
      [name, url]
    );

    return NextResponse.json({
      success: true,
      message: 'RPC created successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error creating RPC:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create RPC' },
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

export async function PUT(request: Request) {
  try {
    const { id, name, url } = await request.json();

    if (!id || !name || !url) {
      return NextResponse.json(
        { success: false, error: 'ID, name and URL are required' },
        { status: 400 }
      );
    }

    // Verificar si el RPC está en uso
    const inUse = await query('SELECT in_use FROM rpcs WHERE id = $1', [id]);
    if (inUse.rows[0]?.in_use) {
      return NextResponse.json(
        { success: false, error: 'Cannot edit RPC that is currently in use' },
        { status: 400 }
      );
    }

    // Verificar duplicados (excluyendo el actual)
    const existing = await query(
      'SELECT id FROM rpcs WHERE (url = $1 OR name = $2) AND id != $3',
      [url, name, id]
    );
    
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'RPC with this name or URL already exists' },
        { status: 400 }
      );
    }

    await query(
      'UPDATE rpcs SET name = $1, url = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [name, url, id]
    );

    return NextResponse.json({
      success: true,
      message: 'RPC updated successfully',
    });
  } catch (error) {
    console.error('Error updating RPC:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update RPC' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID is required' },
        { status: 400 }
      );
    }

    // Verificar si el RPC está en uso
    const inUse = await query('SELECT in_use FROM rpcs WHERE id = $1', [id]);
    if (inUse.rows[0]?.in_use) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete RPC that is currently in use' },
        { status: 400 }
      );
    }

    await query('DELETE FROM rpcs WHERE id = $1', [id]);

    return NextResponse.json({
      success: true,
      message: 'RPC deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting RPC:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete RPC' },
      { status: 500 }
    );
  }
}

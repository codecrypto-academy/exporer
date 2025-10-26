'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RPC } from '@/types';
import { ArrowLeft, CheckCircle, XCircle, Clock, Server } from 'lucide-react';

export default function RPCsPage() {
  const [rpcs, setRpcs] = useState<RPC[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);

  const fetchRPCs = async () => {
    try {
      const res = await fetch('/api/rpcs');
      const data = await res.json();

      if (data.success) {
        setRpcs(data.data);
      }
    } catch (error) {
      console.error('Error fetching RPCs:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRPC = async (id: number, currentStatus: boolean) => {
    setUpdating(id);

    try {
      const res = await fetch('/api/rpcs', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          active: !currentStatus,
        }),
      });

      const data = await res.json();

      if (data.success) {
        // Actualizar el estado local
        setRpcs((prevRpcs) =>
          prevRpcs.map((rpc) =>
            rpc.id === id ? { ...rpc, active: !currentStatus } : rpc
          )
        );
      }
    } catch (error) {
      console.error('Error updating RPC:', error);
    } finally {
      setUpdating(null);
    }
  };

  useEffect(() => {
    fetchRPCs();

    // Auto-refresh cada 10 segundos
    const interval = setInterval(fetchRPCs, 10000);
    return () => clearInterval(interval);
  }, []);

  const activeRPCs = rpcs.filter((rpc) => rpc.active);
  const inUseRPCs = rpcs.filter((rpc) => rpc.in_use);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-50 dark:bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-zinc-600 dark:text-zinc-400">Cargando RPCs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      {/* Header */}
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                  Gestión de RPCs
                </h1>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  {activeRPCs.length} activos · {inUseRPCs.length} en uso · {rpcs.length} total
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                    RPCs Activos
                  </p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
                    {activeRPCs.length}
                  </p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                    En Uso
                  </p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                    {inUseRPCs.length}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                    Total RPCs
                  </p>
                  <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mt-2">
                    {rpcs.length}
                  </p>
                </div>
                <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                  <Server className="w-6 h-6 text-zinc-600 dark:text-zinc-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RPCs List */}
        <Card>
          <CardHeader>
            <CardTitle>Endpoints Disponibles</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      URL
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Último Bloque
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-200 dark:divide-zinc-800">
                  {rpcs.map((rpc) => (
                    <tr key={rpc.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {rpc.name}
                        </div>
                        {rpc.in_use && rpc.consumer_id && (
                          <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                            {rpc.consumer_id.substring(0, 12)}...
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-zinc-600 dark:text-zinc-400 font-mono truncate max-w-xs">
                          {rpc.url}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          {rpc.active ? (
                            <Badge variant="success">Activo</Badge>
                          ) : (
                            <Badge variant="error">Inactivo</Badge>
                          )}
                          {rpc.in_use && <Badge variant="info">En Uso</Badge>}
                          {rpc.error && <Badge variant="error">Error</Badge>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-900 dark:text-zinc-100">
                        {rpc.last_block?.toLocaleString() || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => toggleRPC(rpc.id, rpc.active)}
                          disabled={updating === rpc.id || rpc.in_use}
                          className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                            rpc.active
                              ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50'
                              : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {updating === rpc.id
                            ? 'Actualizando...'
                            : rpc.active
                            ? 'Desactivar'
                            : 'Activar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

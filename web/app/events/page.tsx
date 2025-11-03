'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Event } from '@/types';
import { ArrowLeft, Search, Filter, FileText, Hash, Box, Copy, Check } from 'lucide-react';

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  
  // Filtros
  const [filters, setFilters] = useState({
    block: '',
    tx: '',
    contract: '',
    event: '',
  });
  
  const [activeFilters, setActiveFilters] = useState(filters);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      params.append('limit', '100');
      
      if (activeFilters.block) params.append('block', activeFilters.block);
      if (activeFilters.tx) params.append('tx', activeFilters.tx);
      if (activeFilters.contract) params.append('contract', activeFilters.contract);
      if (activeFilters.event) params.append('event', activeFilters.event);

      const res = await fetch(`/api/events?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setEvents(data.data.events);
        setStats(data.data.stats);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    setActiveFilters(filters);
  };

  const clearFilters = () => {
    setFilters({ block: '', tx: '', contract: '', event: '' });
    setActiveFilters({ block: '', tx: '', contract: '', event: '' });
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAddress(`${type}-${text}`);
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [activeFilters]);

  const hasActiveFilters = Object.values(activeFilters).some(v => v !== '');

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
                  Eventos de Ethereum
                </h1>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  {stats && `${stats.total.toLocaleString()} eventos · ${stats.uniqueContracts} contratos únicos`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros de Búsqueda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Número de Bloque
                </label>
                <input
                  type="text"
                  value={filters.block}
                  onChange={(e) => setFilters({ ...filters, block: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: 18000000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Hash de Transacción
                </label>
                <input
                  type="text"
                  value={filters.tx}
                  onChange={(e) => setFilters({ ...filters, tx: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  placeholder="0x..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Dirección de Contrato
                </label>
                <input
                  type="text"
                  value={filters.contract}
                  onChange={(e) => setFilters({ ...filters, contract: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  placeholder="0x..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Nombre del Evento
                </label>
                <input
                  type="text"
                  value={filters.event}
                  onChange={(e) => setFilters({ ...filters, event: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: Transfer"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={applyFilters}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                <Search className="w-4 h-4" />
                Buscar
              </button>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  Limpiar Filtros
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">Total Eventos</p>
                    <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                      {stats.total.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Box className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">Bloque Mínimo</p>
                    <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50 font-mono">
                      {stats.minBlock?.toLocaleString() || '-'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Box className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">Bloque Máximo</p>
                    <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50 font-mono">
                      {stats.maxBlock?.toLocaleString() || '-'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <Hash className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">Contratos</p>
                    <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                      {stats.uniqueContracts?.toLocaleString() || '-'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Events Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Eventos Encontrados ({events.length})</CardTitle>
              {hasActiveFilters && (
                <Badge variant="info">Filtros activos</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-zinc-600 dark:text-zinc-400">Cargando eventos...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                        Bloque
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                        Evento
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                        Contrato
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                        Transacción
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                        Log Index
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-200 dark:divide-zinc-800">
                    {events.map((event, idx) => (
                      <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm font-mono font-bold text-blue-600 dark:text-blue-400">
                            {event.block_number.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="max-w-xs">
                            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                              {event.event_name || 'Unknown'}
                            </p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono truncate">
                              {event.event_signature?.substring(0, 10)}...
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400">
                              {event.contract_address.substring(0, 6)}...{event.contract_address.substring(38)}
                            </span>
                            <button
                              onClick={() => copyToClipboard(event.contract_address, 'contract')}
                              className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
                              title="Copiar dirección completa"
                            >
                              {copiedAddress === `contract-${event.contract_address}` ? (
                                <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                              ) : (
                                <Copy className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400">
                              {event.transaction_hash.substring(0, 10)}...{event.transaction_hash.substring(60)}
                            </span>
                            <button
                              onClick={() => copyToClipboard(event.transaction_hash, 'tx')}
                              className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
                              title="Copiar hash completo"
                            >
                              {copiedAddress === `tx-${event.transaction_hash}` ? (
                                <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                              ) : (
                                <Copy className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-zinc-900 dark:text-zinc-100">
                          {event.log_index}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {events.length === 0 && !loading && (
                  <div className="p-12 text-center text-zinc-500 dark:text-zinc-400">
                    {hasActiveFilters 
                      ? 'No se encontraron eventos con los filtros aplicados' 
                      : 'No hay eventos para mostrar'}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}


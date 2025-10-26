'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { StatsCard } from '@/components/dashboard/stats-card';
import { ConsumersTable } from '@/components/dashboard/consumers-table';
import { DashboardStats, ConsumerMetric } from '@/types';
import {
  Activity,
  Database,
  Zap,
  AlertCircle,
  TrendingUp,
  Server,
  ExternalLink,
} from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [consumers, setConsumers] = useState<ConsumerMetric[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [statsRes, consumersRes] = await Promise.all([
        fetch('/api/metrics/system'),
        fetch('/api/consumers?limit=20'),
      ]);

      const statsData = await statsRes.json();
      const consumersData = await consumersRes.json();

      if (statsData.success) {
        setStats(statsData.data);
      }

      if (consumersData.success) {
        setConsumers(consumersData.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Auto-refresh cada 5 segundos
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-50 dark:bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-zinc-600 dark:text-zinc-400">Cargando dashboard...</p>
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
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                Ethereum Block Processor
              </h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Sistema distribuido de procesamiento de bloques
              </p>
            </div>
            <div className="flex gap-4">
              <Link
                href="/rpcs"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Server className="w-4 h-4" />
                Gestionar RPCs
              </Link>
              <Link
                href="/events"
                className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                <Database className="w-4 h-4" />
                Ver Eventos
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Bloques Procesados"
            value={stats.totalBlocksProcessed}
            subtitle="Total acumulado"
            icon={Database}
          />
          <StatsCard
            title="Eventos Extraídos"
            value={stats.totalEventsExtracted}
            subtitle="Total de eventos decodificados"
            icon={Activity}
          />
          <StatsCard
            title="Velocidad"
            value={`${stats.blocksPerSecond.toFixed(2)} b/s`}
            subtitle="Bloques por segundo"
            icon={Zap}
          />
          <StatsCard
            title="Tasa de Éxito"
            value={`${stats.successRate.toFixed(1)}%`}
            subtitle={`${stats.totalConsumersFailed} fallidos`}
            icon={TrendingUp}
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  Consumidores Activos
                </p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">
                  {stats.totalConsumersActive}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Activity className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  Tiempo Promedio
                </p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mt-2">
                  {(stats.averageExecutionTime / 1000).toFixed(1)}s
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Zap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  Consumidores Fallidos
                </p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-2">
                  {stats.totalConsumersFailed}
                </p>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Consumers Table */}
        <div className="mb-8">
          <ConsumersTable consumers={consumers} />
        </div>

        {/* Links útiles */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4">
            Enlaces Rápidos
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="http://localhost:15672"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
            >
              <ExternalLink className="w-4 h-4" />
              RabbitMQ Management
            </a>
            <Link
              href="/rpcs"
              className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
            >
              <Server className="w-4 h-4" />
              Gestión de RPCs
            </Link>
            <Link
              href="/events"
              className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
            >
              <Database className="w-4 h-4" />
              Explorador de Eventos
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

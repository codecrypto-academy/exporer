import { NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { DashboardStats } from '@/types';

export async function GET() {
  try {
    // Obtener métricas del sistema
    const systemMetricsQuery = `
      SELECT metric_name, metric_value, metric_value_decimal
      FROM system_metrics
      WHERE metric_name IN (
        'total_blocks_processed',
        'total_events_extracted',
        'total_consumers_active',
        'total_consumers_failed',
        'blocks_per_second',
        'average_execution_time_ms',
        'success_rate_percentage'
      )
    `;

    const result = await query(systemMetricsQuery);
    const metrics = result.rows;

    // Transformar a formato de dashboard
    const stats: DashboardStats = {
      totalBlocksProcessed: 0,
      totalEventsExtracted: 0,
      totalConsumersActive: 0,
      totalConsumersFailed: 0,
      blocksPerSecond: 0,
      averageExecutionTime: 0,
      successRate: 100,
    };

    metrics.forEach((metric: any) => {
      const value = metric.metric_value_decimal || metric.metric_value || 0;

      switch (metric.metric_name) {
        case 'total_blocks_processed':
          stats.totalBlocksProcessed = parseInt(metric.metric_value, 10);
          break;
        case 'total_events_extracted':
          stats.totalEventsExtracted = parseInt(metric.metric_value, 10);
          break;
        case 'total_consumers_active':
          stats.totalConsumersActive = parseInt(metric.metric_value, 10);
          break;
        case 'total_consumers_failed':
          stats.totalConsumersFailed = parseInt(metric.metric_value, 10);
          break;
        case 'blocks_per_second':
          stats.blocksPerSecond = parseFloat(value);
          break;
        case 'average_execution_time_ms':
          stats.averageExecutionTime = parseFloat(value);
          break;
        case 'success_rate_percentage':
          stats.successRate = parseFloat(value);
          break;
      }
    });

    // Obtener estadísticas calculadas desde consumer_metrics
    const consumerStatsQuery = `
      SELECT
        COUNT(*) FILTER (WHERE status = 'processing') as active,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COALESCE(SUM(blocks_processed), 0) as total_blocks,
        COALESCE(SUM(events_extracted), 0) as total_events,
        COALESCE(AVG(blocks_per_second), 0) as avg_bps,
        COALESCE(AVG(execution_time_ms), 0) as avg_time
      FROM consumer_metrics
    `;

    const consumerStats = await query(consumerStatsQuery);
    const cs = consumerStats.rows[0];

    // Actualizar con datos reales de consumidores
    stats.totalConsumersActive = parseInt(cs.active, 10);
    stats.totalConsumersFailed = parseInt(cs.failed, 10);
    stats.totalBlocksProcessed = parseInt(cs.total_blocks, 10);
    stats.totalEventsExtracted = parseInt(cs.total_events, 10);
    stats.blocksPerSecond = parseFloat(cs.avg_bps) || 0;
    stats.averageExecutionTime = parseFloat(cs.avg_time) || 0;

    // Calcular tasa de éxito
    const totalQuery = `
      SELECT
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'failed') as failed
      FROM consumer_metrics
    `;
    const totalResult = await query(totalQuery);
    const total = totalResult.rows[0];
    const completed = parseInt(total.completed, 10);
    const failed = parseInt(total.failed, 10);
    const totalProcessed = completed + failed;

    if (totalProcessed > 0) {
      stats.successRate = (completed / totalProcessed) * 100;
    }

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching system metrics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch system metrics' },
      { status: 500 }
    );
  }
}

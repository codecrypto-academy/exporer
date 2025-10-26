// RPC Types
export interface RPC {
  id: number;
  name: string;
  url: string;
  last_block: number | null;
  last_update: Date | null;
  active: boolean;
  tested: boolean;
  execution_time: string | null;
  registros: number | null;
  error: string | null;
  in_use: boolean;
  consumer_id: string | null;
  created_at: Date;
  updated_at: Date;
}

// Consumer Metric Types
export interface ConsumerMetric {
  id: number;
  consumer_id: string;
  rpc_id: number | null;
  rpc_url: string | null;
  status: 'processing' | 'completed' | 'failed' | 'retrying';
  blocks_processed: number;
  events_extracted: number;
  transactions_processed: number;
  errors_count: number;
  retry_count: number;
  start_block: number | null;
  end_block: number | null;
  current_block: number | null;
  execution_time_ms: number | null;
  blocks_per_second: number | null;
  started_at: Date;
  finished_at: Date | null;
  error_message: string | null;
  stack_trace: string | null;
}

// System Metrics Types
export interface SystemMetric {
  id: number;
  metric_name: string;
  metric_value: number;
  metric_value_decimal: number | null;
  metric_type: 'counter' | 'gauge' | 'rate' | 'average';
  description: string | null;
  updated_at: Date;
}

// Event Types
export interface Event {
  id: number;
  block_hash: string;
  transaction_hash: string;
  block_number: number;
  transaction_index: number | null;
  log_index: number | null;
  contract_address: string | null;
  event_name: string | null;
  event_signature: string;
  param_1: string | null;
  param_2: string | null;
  param_3: string | null;
  param_4: string | null;
  param_5: string | null;
  block_timestamp: Date | null;
  created_at: Date;
}

// Dashboard Stats
export interface DashboardStats {
  totalBlocksProcessed: number;
  totalEventsExtracted: number;
  totalConsumersActive: number;
  totalConsumersFailed: number;
  blocksPerSecond: number;
  averageExecutionTime: number;
  successRate: number;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

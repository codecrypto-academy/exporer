-- Migration: Create Consumer Metrics table
-- Description: Stores individual metrics for each consumer/worker execution

CREATE TABLE IF NOT EXISTS consumer_metrics (
    id SERIAL PRIMARY KEY,
    consumer_id VARCHAR(255) NOT NULL,
    rpc_id INTEGER REFERENCES rpcs(id) ON DELETE SET NULL,
    rpc_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'processing',
    blocks_processed INTEGER DEFAULT 0,
    events_extracted INTEGER DEFAULT 0,
    transactions_processed INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    retry_count INTEGER DEFAULT 0,
    start_block BIGINT,
    end_block BIGINT,
    current_block BIGINT,
    execution_time_ms BIGINT,
    blocks_per_second DECIMAL(10, 2),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP,
    error_message TEXT,
    stack_trace TEXT,
    CONSTRAINT chk_status CHECK (status IN ('processing', 'completed', 'failed', 'retrying'))
);

-- Create indexes for metrics queries
CREATE INDEX idx_consumer_metrics_consumer_id ON consumer_metrics(consumer_id);
CREATE INDEX idx_consumer_metrics_status ON consumer_metrics(status);
CREATE INDEX idx_consumer_metrics_started_at ON consumer_metrics(started_at);
CREATE INDEX idx_consumer_metrics_rpc_id ON consumer_metrics(rpc_id);
CREATE INDEX idx_consumer_metrics_blocks ON consumer_metrics(start_block, end_block);

-- Create composite indexes
CREATE INDEX idx_consumer_metrics_consumer_status ON consumer_metrics(consumer_id, status);
CREATE INDEX idx_consumer_metrics_rpc_status ON consumer_metrics(rpc_id, status);

-- Add comments
COMMENT ON TABLE consumer_metrics IS 'Individual metrics for each consumer/worker execution';
COMMENT ON COLUMN consumer_metrics.consumer_id IS 'Unique identifier for the consumer instance';
COMMENT ON COLUMN consumer_metrics.rpc_id IS 'Reference to the RPC endpoint used';
COMMENT ON COLUMN consumer_metrics.status IS 'Current status: processing, completed, failed, retrying';
COMMENT ON COLUMN consumer_metrics.blocks_processed IS 'Number of blocks successfully processed';
COMMENT ON COLUMN consumer_metrics.events_extracted IS 'Total events extracted and stored';
COMMENT ON COLUMN consumer_metrics.current_block IS 'Current block being processed';
COMMENT ON COLUMN consumer_metrics.execution_time_ms IS 'Total execution time in milliseconds';
COMMENT ON COLUMN consumer_metrics.blocks_per_second IS 'Processing rate (blocks/second)';

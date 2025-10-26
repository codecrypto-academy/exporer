-- Migration: Create System Metrics table
-- Description: Stores aggregated system-wide metrics

CREATE TABLE IF NOT EXISTS system_metrics (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(255) NOT NULL UNIQUE,
    metric_value BIGINT DEFAULT 0,
    metric_value_decimal DECIMAL(10, 2),
    metric_type VARCHAR(50) NOT NULL DEFAULT 'counter',
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_metric_type CHECK (metric_type IN ('counter', 'gauge', 'rate', 'average'))
);

-- Create indexes
CREATE INDEX idx_system_metrics_name ON system_metrics(metric_name);
CREATE INDEX idx_system_metrics_type ON system_metrics(metric_type);
CREATE INDEX idx_system_metrics_updated_at ON system_metrics(updated_at);

-- Insert initial system metrics
INSERT INTO system_metrics (metric_name, metric_value, metric_type, description) VALUES
    ('total_blocks_processed', 0, 'counter', 'Total number of blocks processed'),
    ('total_events_extracted', 0, 'counter', 'Total number of events extracted'),
    ('total_transactions_processed', 0, 'counter', 'Total number of transactions processed'),
    ('total_consumers_active', 0, 'gauge', 'Number of currently active consumers'),
    ('total_consumers_failed', 0, 'counter', 'Total number of failed consumers'),
    ('total_execution_time_ms', 0, 'counter', 'Total execution time in milliseconds'),
    ('total_errors', 0, 'counter', 'Total number of errors encountered'),
    ('total_retries', 0, 'counter', 'Total number of retries attempted')
ON CONFLICT (metric_name) DO NOTHING;

INSERT INTO system_metrics (metric_name, metric_value_decimal, metric_type, description) VALUES
    ('blocks_per_second', 0.00, 'rate', 'Current processing rate (blocks/second)'),
    ('average_execution_time_ms', 0.00, 'average', 'Average execution time per block range'),
    ('average_events_per_block', 0.00, 'average', 'Average number of events per block'),
    ('average_transactions_per_block', 0.00, 'average', 'Average number of transactions per block'),
    ('success_rate_percentage', 100.00, 'rate', 'Percentage of successful consumer executions')
ON CONFLICT (metric_name) DO NOTHING;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_system_metrics_updated_at BEFORE UPDATE ON system_metrics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to increment counter metrics
CREATE OR REPLACE FUNCTION increment_system_metric(
    p_metric_name VARCHAR(255),
    p_increment BIGINT DEFAULT 1
)
RETURNS VOID AS $$
BEGIN
    UPDATE system_metrics
    SET metric_value = metric_value + p_increment
    WHERE metric_name = p_metric_name AND metric_type = 'counter';
END;
$$ LANGUAGE plpgsql;

-- Create function to set gauge metrics
CREATE OR REPLACE FUNCTION set_system_metric(
    p_metric_name VARCHAR(255),
    p_value BIGINT
)
RETURNS VOID AS $$
BEGIN
    UPDATE system_metrics
    SET metric_value = p_value
    WHERE metric_name = p_metric_name;
END;
$$ LANGUAGE plpgsql;

-- Create function to set decimal metrics
CREATE OR REPLACE FUNCTION set_system_metric_decimal(
    p_metric_name VARCHAR(255),
    p_value DECIMAL(10, 2)
)
RETURNS VOID AS $$
BEGIN
    UPDATE system_metrics
    SET metric_value_decimal = p_value
    WHERE metric_name = p_metric_name;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON TABLE system_metrics IS 'System-wide aggregated metrics';
COMMENT ON COLUMN system_metrics.metric_name IS 'Unique name of the metric';
COMMENT ON COLUMN system_metrics.metric_value IS 'Integer value (for counters and gauges)';
COMMENT ON COLUMN system_metrics.metric_value_decimal IS 'Decimal value (for rates and averages)';
COMMENT ON COLUMN system_metrics.metric_type IS 'Type of metric: counter, gauge, rate, or average';
COMMENT ON FUNCTION increment_system_metric IS 'Increment a counter metric by a specified amount';
COMMENT ON FUNCTION set_system_metric IS 'Set an integer metric value';
COMMENT ON FUNCTION set_system_metric_decimal IS 'Set a decimal metric value';

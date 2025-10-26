-- Migration: Create RPCs table
-- Description: Stores Ethereum RPC endpoints configuration and status

CREATE TABLE IF NOT EXISTS rpcs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    url TEXT NOT NULL UNIQUE,
    last_block BIGINT,
    last_update TIMESTAMP,
    active BOOLEAN DEFAULT true,
    tested BOOLEAN DEFAULT false,
    execution_time VARCHAR(50),
    registros INTEGER,
    error TEXT,
    in_use BOOLEAN DEFAULT false,
    consumer_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_rpcs_active ON rpcs(active);
CREATE INDEX idx_rpcs_in_use ON rpcs(in_use);
CREATE INDEX idx_rpcs_name ON rpcs(name);

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_rpcs_updated_at BEFORE UPDATE ON rpcs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE rpcs IS 'Stores Ethereum RPC endpoints configuration and metrics';
COMMENT ON COLUMN rpcs.name IS 'Human-readable name of the RPC provider';
COMMENT ON COLUMN rpcs.url IS 'RPC endpoint URL';
COMMENT ON COLUMN rpcs.last_block IS 'Last block number retrieved from this RPC';
COMMENT ON COLUMN rpcs.in_use IS 'Whether this RPC is currently being used by a consumer';
COMMENT ON COLUMN rpcs.consumer_id IS 'ID of the consumer currently using this RPC';

-- Migration: Create Events table
-- Description: Stores decoded Ethereum events from smart contracts

CREATE TABLE IF NOT EXISTS events (
    id BIGSERIAL PRIMARY KEY,
    block_hash VARCHAR(66) NOT NULL,
    transaction_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    transaction_index INTEGER,
    log_index INTEGER,
    contract_address VARCHAR(42),
    event_name VARCHAR(255),
    event_signature VARCHAR(66) NOT NULL,
    param_1 TEXT,
    param_2 TEXT,
    param_3 TEXT,
    param_4 TEXT,
    param_5 TEXT,
    param_6 TEXT,
    param_7 TEXT,
    param_8 TEXT,
    param_9 TEXT,
    param_10 TEXT,
    param_11 TEXT,
    param_12 TEXT,
    param_13 TEXT,
    param_14 TEXT,
    param_15 TEXT,
    param_16 TEXT,
    param_17 TEXT,
    param_18 TEXT,
    param_19 TEXT,
    param_20 TEXT,
    block_timestamp TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient querying
CREATE INDEX idx_events_block_number ON events(block_number);
CREATE INDEX idx_events_transaction_hash ON events(transaction_hash);
CREATE INDEX idx_events_block_hash ON events(block_hash);
CREATE INDEX idx_events_event_signature ON events(event_signature);
CREATE INDEX idx_events_contract_address ON events(contract_address);
CREATE INDEX idx_events_event_name ON events(event_name);
CREATE INDEX idx_events_block_timestamp ON events(block_timestamp);

-- Create composite indexes for common query patterns
CREATE INDEX idx_events_block_tx ON events(block_number, transaction_hash);
CREATE INDEX idx_events_contract_signature ON events(contract_address, event_signature);

-- Add comments
COMMENT ON TABLE events IS 'Stores decoded Ethereum smart contract events';
COMMENT ON COLUMN events.block_hash IS 'Hash of the block containing this event';
COMMENT ON COLUMN events.transaction_hash IS 'Hash of the transaction that emitted this event';
COMMENT ON COLUMN events.event_signature IS 'Keccak256 hash of the event signature';
COMMENT ON COLUMN events.event_name IS 'Human-readable event name (decoded from 4byte.directory)';
COMMENT ON COLUMN events.param_1 IS 'First decoded parameter of the event';

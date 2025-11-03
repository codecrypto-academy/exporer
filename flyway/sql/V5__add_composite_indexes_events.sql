-- Migration: Add composite indexes to events table
-- Description: Adds composite indexes for transaction_hash, contract_address, and block_number
--              to optimize complex queries that filter by multiple columns

-- Composite index for queries filtering by contract_address and block_number
-- Useful for: "Find all events from contract X in block range Y-Z"
CREATE INDEX IF NOT EXISTS idx_events_contract_block 
ON events(contract_address, block_number);

-- Composite index for queries filtering by contract_address and transaction_hash
-- Useful for: "Find all events from contract X in transaction Y"
CREATE INDEX IF NOT EXISTS idx_events_contract_tx 
ON events(contract_address, transaction_hash);

-- Composite index for queries filtering by block_number, contract_address, and transaction_hash
-- Useful for: "Find events in block X from contract Y in transaction Z"
-- This is a covering index for the three most commonly queried columns together
CREATE INDEX IF NOT EXISTS idx_events_block_contract_tx 
ON events(block_number, contract_address, transaction_hash);

-- Additional composite index for transaction-focused queries
-- Useful for: "Find all events in transaction X from block Y"
CREATE INDEX IF NOT EXISTS idx_events_tx_block 
ON events(transaction_hash, block_number);

-- Hash indexes for exact equality searches (faster than btree for equality)
-- Note: Hash indexes are only useful for equality comparisons, not range queries
CREATE INDEX IF NOT EXISTS idx_events_contract_hash 
ON events USING hash (contract_address);

CREATE INDEX IF NOT EXISTS idx_events_tx_hash 
ON events USING hash (transaction_hash);

-- Add comments for documentation
COMMENT ON INDEX idx_events_contract_block IS 
'Composite index for queries filtering by contract address and block number';

COMMENT ON INDEX idx_events_contract_tx IS 
'Composite index for queries filtering by contract address and transaction hash';

COMMENT ON INDEX idx_events_block_contract_tx IS 
'Composite index covering block_number, contract_address, and transaction_hash';

COMMENT ON INDEX idx_events_tx_block IS 
'Composite index for transaction-focused queries with block number';

COMMENT ON INDEX idx_events_contract_hash IS 
'Hash index for fast equality lookups by contract address';

COMMENT ON INDEX idx_events_tx_hash IS 
'Hash index for fast equality lookups by transaction hash';


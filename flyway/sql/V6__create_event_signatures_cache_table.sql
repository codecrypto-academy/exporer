-- Migration: Create Event Signatures Cache table
-- Description: Stores translations from event signatures (hex) to human-readable event names
--              This serves as a cache to avoid repeated calls to 4byte.directory API

CREATE TABLE IF NOT EXISTS event_signatures_cache (
    id SERIAL PRIMARY KEY,
    signature VARCHAR(66) NOT NULL UNIQUE,
    event_name VARCHAR(255) NOT NULL,
    text_signature TEXT,
    source VARCHAR(50) DEFAULT '4byte.directory',
    hit_count INTEGER DEFAULT 1,
    first_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for fast lookups
CREATE INDEX idx_event_signatures_signature ON event_signatures_cache(signature);
CREATE INDEX idx_event_signatures_name ON event_signatures_cache(event_name);
CREATE INDEX idx_event_signatures_last_used ON event_signatures_cache(last_used_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_event_signatures_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER trigger_event_signatures_updated_at
    BEFORE UPDATE ON event_signatures_cache
    FOR EACH ROW
    EXECUTE FUNCTION update_event_signatures_updated_at();

-- Add comments for documentation
COMMENT ON TABLE event_signatures_cache IS 
'Cache table for event signature to name translations from 4byte.directory';

COMMENT ON COLUMN event_signatures_cache.signature IS 
'Keccak256 hash of the event signature (e.g., 0xddf252ad...)';

COMMENT ON COLUMN event_signatures_cache.event_name IS 
'Human-readable event name (e.g., Transfer, Approval)';

COMMENT ON COLUMN event_signatures_cache.text_signature IS 
'Full text signature with parameter types (e.g., Transfer(address,address,uint256))';

COMMENT ON COLUMN event_signatures_cache.source IS 
'Source of the translation (4byte.directory, manual, etc.)';

COMMENT ON COLUMN event_signatures_cache.hit_count IS 
'Number of times this signature has been looked up (for analytics)';

COMMENT ON COLUMN event_signatures_cache.first_seen_at IS 
'Timestamp when this signature was first cached';

COMMENT ON COLUMN event_signatures_cache.last_used_at IS 
'Timestamp of the last lookup of this signature';

-- Insert some common event signatures for immediate use
INSERT INTO event_signatures_cache (signature, event_name, text_signature, source) VALUES
    ('0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef', 'Transfer', 'Transfer(address,address,uint256)', 'manual'),
    ('0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925', 'Approval', 'Approval(address,address,uint256)', 'manual'),
    ('0xe1fffcc4923d04b559f4d29a8bfc6cda04eb5b0d3c460751c2402c5c5cc9109c', 'Deposit', 'Deposit(address,uint256)', 'manual'),
    ('0x7fcf532c15f0a6db0bd6d0e038bea71d30d808c7d98cb3bf7268a95bf5081b65', 'Withdrawal', 'Withdrawal(address,uint256)', 'manual'),
    ('0x2f8788117e7eff1d82e926ec794901d17c78024a50270940304540a733656f0d', 'RoleGranted', 'RoleGranted(bytes32,address,address)', 'manual'),
    ('0xf6391f5c32d9c69d2a47ea670b442974b53935d1edc7fd64eb21e047a839171b', 'RoleRevoked', 'RoleRevoked(bytes32,address,address)', 'manual'),
    ('0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0', 'OwnershipTransferred', 'OwnershipTransferred(address,address)', 'manual'),
    ('0x17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31', 'ApprovalForAll', 'ApprovalForAll(address,address,bool)', 'manual')
ON CONFLICT (signature) DO NOTHING;

-- Create a view for frequently used signatures
CREATE OR REPLACE VIEW event_signatures_popular AS
SELECT 
    signature,
    event_name,
    text_signature,
    hit_count,
    last_used_at
FROM event_signatures_cache
WHERE hit_count > 10
ORDER BY hit_count DESC;

COMMENT ON VIEW event_signatures_popular IS 
'View of frequently accessed event signatures for monitoring and analytics';


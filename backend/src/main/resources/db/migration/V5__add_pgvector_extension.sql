-- Add pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Create trade_data_chunks table to store embeddings
CREATE TABLE IF NOT EXISTS trade_data_chunks (
    id BIGSERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    metadata JSONB NOT NULL,
    embedding vector(1536) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create vector similarity index using HNSW (Hierarchical Navigable Small World)
-- This provides fast approximate nearest neighbor search
CREATE INDEX IF NOT EXISTS idx_trade_data_chunks_embedding 
    ON trade_data_chunks 
    USING hnsw (embedding vector_cosine_ops);

-- Create GIN index on metadata JSONB column for efficient metadata queries during upsert
CREATE INDEX IF NOT EXISTS idx_trade_data_chunks_metadata 
    ON trade_data_chunks 
    USING gin (metadata);

-- Create index on created_at for cleanup operations
CREATE INDEX IF NOT EXISTS idx_trade_data_chunks_created_at 
    ON trade_data_chunks(created_at);


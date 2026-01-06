-- Add pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Create document_chunks table to store embeddings
CREATE TABLE IF NOT EXISTS document_chunks (
    id BIGSERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    metadata JSONB NOT NULL,
    embedding vector(1536) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create vector similarity index using HNSW (Hierarchical Navigable Small World)
-- This provides fast approximate nearest neighbor search
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding 
    ON document_chunks 
    USING hnsw (embedding vector_cosine_ops);

-- Create GIN index on metadata JSONB column for efficient metadata queries during upsert
CREATE INDEX IF NOT EXISTS idx_document_chunks_metadata 
    ON document_chunks 
    USING gin (metadata);

-- Create index on created_at for cleanup operations
CREATE INDEX IF NOT EXISTS idx_document_chunks_created_at 
    ON document_chunks(created_at);


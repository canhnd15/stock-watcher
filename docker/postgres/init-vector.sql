-- Initialize pgvector extension for the trade database
-- This script runs automatically when the database is first created

-- Create the vector extension if it doesn't exist
CREATE EXTENSION IF NOT EXISTS vector;


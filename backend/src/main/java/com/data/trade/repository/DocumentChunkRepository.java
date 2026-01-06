package com.data.trade.repository;

import com.data.trade.model.DocumentChunk;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface DocumentChunkRepository extends JpaRepository<DocumentChunk, Long> {

    /**
     * Find similar chunks using vector cosine similarity search
     * Uses pgvector's cosine distance operator
     * 
     * @param embeddingVector String representation of embedding vector (comma-separated floats)
     * @param limit Maximum number of results
     * @param similarityThreshold Minimum similarity score (0-1, higher is more similar)
     * @return List of similar document chunks ordered by similarity
     */
    @Query(value = """
        SELECT id, content, metadata, embedding, created_at
        FROM document_chunks
        WHERE 1 - (embedding <=> CAST(:embeddingVector AS vector)) >= :similarityThreshold
        ORDER BY embedding <=> CAST(:embeddingVector AS vector)
        LIMIT :limit
        """, nativeQuery = true)
    List<Object[]> findSimilarChunksNative(
        @Param("embeddingVector") String embeddingVector,
        @Param("limit") int limit,
        @Param("similarityThreshold") double similarityThreshold
    );

    /**
     * Delete chunks by metadata filter (for upsert operations)
     * Uses JSONB containment operator for efficient filtering
     * 
     * @param metadataFilter JSONB object to match against metadata
     * @return Number of deleted rows
     */
    @Modifying
    @Transactional
    @Query(value = """
        DELETE FROM document_chunks
        WHERE metadata @> CAST(:metadataFilter AS jsonb)
        """, nativeQuery = true)
    int deleteByMetadata(@Param("metadataFilter") String metadataFilter);

    /**
     * Count chunks by metadata filter
     */
    @Query(value = """
        SELECT COUNT(*) FROM document_chunks
        WHERE metadata @> CAST(:metadataFilter AS jsonb)
        """, nativeQuery = true)
    long countByMetadata(@Param("metadataFilter") String metadataFilter);

    /**
     * Find chunks by metadata filter
     */
    @Query(value = """
        SELECT id, content, metadata, embedding, created_at
        FROM document_chunks
        WHERE metadata @> CAST(:metadataFilter AS jsonb)
        ORDER BY created_at DESC
        """, nativeQuery = true)
    List<Object[]> findByMetadata(@Param("metadataFilter") String metadataFilter);
}


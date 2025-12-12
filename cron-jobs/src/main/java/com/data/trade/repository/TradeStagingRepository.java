package com.data.trade.repository;

import com.data.trade.model.TradeStaging;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface TradeStagingRepository extends JpaRepository<TradeStaging, Long> {
    
    @Transactional
    @Modifying
    @Query(value = "TRUNCATE TABLE trades_staging", nativeQuery = true)
    void truncateStaging();
    
    @Transactional
    @Modifying
    @Query(value = """
        INSERT INTO trades (code, price, volume, side, trade_date, trade_time)
        SELECT code, price, volume, side, trade_date, trade_time
        FROM trades_staging
        WHERE TO_DATE(trade_date, 'DD/MM/YYYY') = TO_DATE(:tradeDate, 'DD/MM/YYYY')
        """, nativeQuery = true)
    void copyStagingToMain(@Param("tradeDate") String tradeDate);
    
    @Query(value = """
        SELECT COUNT(*) FROM trades_staging 
        WHERE TO_DATE(trade_date, 'DD/MM/YYYY') = TO_DATE(:tradeDate, 'DD/MM/YYYY')
        """, nativeQuery = true)
    long countByTradeDate(@Param("tradeDate") String tradeDate);
}


package com.data.trade.repository;

import com.data.trade.model.Trade;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface TradeRepository extends JpaRepository<Trade, Long>, JpaSpecificationExecutor<Trade> {
    
    @Query("SELECT DISTINCT t.code FROM Trade t")
    List<String> findDistinctCodes();
    
    // Find latest trade for a given code, ordering by date DESC then time DESC
    @Query("SELECT t FROM Trade t WHERE t.code = :code ORDER BY t.tradeDate DESC, t.tradeTime DESC")
    List<Trade> findLatestByCode(@Param("code") String code);

    // Find trades for a code on a specific date
    @Query("SELECT t FROM Trade t WHERE t.code = :code AND t.tradeDate = :tradeDate ORDER BY t.tradeTime DESC")
    List<Trade> findByCodeAndTradeDate(@Param("code") String code, @Param("tradeDate") String tradeDate);

    @Transactional
    @Modifying
    @Query(value = "delete from trades where code = :code and trade_date = :tradeDate", nativeQuery = true)
    void deleteForCodeOnDate(@Param("code") String code, @Param("tradeDate") String tradeDate);

    @Query(value = """
        select case
          when (
            coalesce(sum(case when t.side = 'sell' and t.volume >= 400000 then 1 else 0 end), 0) +
            coalesce(sum(case when t.side = 'sell' and t.volume >= 100000 then 0.5 else 0 end), 0)
          ) > (
            coalesce(sum(case when t.side = 'buy'  and t.volume >= 400000 then 1 else 0 end), 0) +
            coalesce(sum(case when t.side = 'buy'  and t.volume >= 100000 then 0.5 else 0 end), 0)
          ) * 1.3 then 'Strong sell signal'
          when (
            coalesce(sum(case when t.side = 'buy'  and t.volume >= 400000 then 1 else 0 end), 0) +
            coalesce(sum(case when t.side = 'buy'  and t.volume >= 100000 then 0.5 else 0 end), 0)
          ) > (
            coalesce(sum(case when t.side = 'sell' and t.volume >= 400000 then 1 else 0 end), 0) +
            coalesce(sum(case when t.side = 'sell' and t.volume >= 100000 then 0.5 else 0 end), 0)
          ) * 1.3 then 'Strong buy signal'
          else 'Neutral — hold'
        end
        from trades t
        where upper(t.code) = upper(:stockCode)
          and t.trade_date = :tradeDate
    """, nativeQuery = true)
    String recommendationFor(
            @Param("stockCode") String stockCode,
            @Param("tradeDate") String tradeDate
    );
}

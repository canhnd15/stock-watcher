package com.data.trade.repository;

import com.data.trade.model.Trade;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

public interface TradeRepository extends JpaRepository<Trade, Long>, JpaSpecificationExecutor<Trade> {
    @Transactional
    @Modifying
    @Query(value = "delete from trades where code = :code and trade_time::date = date(:tradeDate)", nativeQuery = true)
    void deleteForCodeOnDate(@Param("code") String code, @Param("tradeDate") LocalDate tradeDate);

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
          and t.trade_time::date = date(:tradeDate)
    """, nativeQuery = true)
    String recommendationFor(
            @Param("stockCode") String stockCode,
            @Param("tradeDate") LocalDate tradeDate
    );

    @Query(value = """
        select coalesce(sum(t.volume), 0)
        from trades t
        where (:code is null or upper(t.code) = upper(:code))
          and (:type is null or t.side = :type)
          and (:minVolume is null or t.volume >= :minVolume)
          and (:maxVolume is null or t.volume <= :maxVolume)
          and (:minPrice is null or t.price >= :minPrice)
          and (:maxPrice is null or t.price <= :maxPrice)
          and (:highVolume is null or t.volume >= :highVolume)
          and (:fromDate is null or t.trade_time::date >= date(:fromDate))
          and (:toDate is null or t.trade_time::date <= date(:toDate))
    """, nativeQuery = true)
    Long sumVolumeFiltered(
            @Param("code") String code,
            @Param("type") String type,
            @Param("minVolume") Long minVolume,
            @Param("maxVolume") Long maxVolume,
            @Param("minPrice") java.math.BigDecimal minPrice,
            @Param("maxPrice") java.math.BigDecimal maxPrice,
            @Param("highVolume") Integer highVolume,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate
    );
}

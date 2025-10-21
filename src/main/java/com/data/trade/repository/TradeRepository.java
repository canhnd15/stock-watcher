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
    WITH volume_stats AS (
        SELECT
            'current' AS period,
            sum(CASE WHEN volume BETWEEN 200000 AND 499999 THEN volume ELSE 0 END) AS vol_200_500,
            sum(CASE WHEN volume BETWEEN 500000 AND 999999 THEN volume ELSE 0 END) AS vol_500_1m,
            sum(CASE WHEN volume >= 1000000 THEN volume ELSE 0 END) AS vol_gt_1m
        FROM trades
        WHERE upper(code) = upper(:stockCode)
          AND trade_time BETWEEN (now() - interval '5 minutes') AND now()
    
        UNION ALL
    
        SELECT
            'previous' AS period,
            sum(CASE WHEN volume BETWEEN 200000 AND 499999 THEN volume ELSE 0 END) AS vol_200_500,
            sum(CASE WHEN volume BETWEEN 500000 AND 999999 THEN volume ELSE 0 END) AS vol_500_1m,
            sum(CASE WHEN volume >= 1000000 THEN volume ELSE 0 END) AS vol_gt_1m
        FROM trades
        WHERE upper(code) = upper(:stockCode)
          AND trade_time BETWEEN (now() - interval '10 minutes') AND (now() - interval '5 minutes')
    )
    SELECT
        CASE
            WHEN (curr.vol_200_500 + curr.vol_500_1m + curr.vol_gt_1m) >
                 (prev.vol_200_500 + prev.vol_500_1m + prev.vol_gt_1m) * 1.2 THEN 'Strong B'
            WHEN (curr.vol_200_500 + curr.vol_500_1m + curr.vol_gt_1m) <
                 (prev.vol_200_500 + prev.vol_500_1m + prev.vol_gt_1m) * 0.8 THEN 'Strong S'
            ELSE 'HOLD'
        END AS signal
    FROM
        (SELECT * FROM volume_stats WHERE period = 'current') curr,
        (SELECT * FROM volume_stats WHERE period = 'previous') prev;
    """, nativeQuery = true)
    String recommendationForV1(
            @Param("stockCode") String stockCode
    );
    @Query(value = """
        select coalesce(sum(t.volume)::bigint, 0) as total_volume
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

    @Query(value = """
        with filtered as (
            select * from trades t
            where (:code is null or upper(t.code) = upper(:code))
              and (:type is null or t.side = :type)
              and (:minVolume is null or t.volume >= :minVolume)
              and (:maxVolume is null or t.volume <= :maxVolume)
              and (:minPrice is null or t.price >= :minPrice)
              and (:maxPrice is null or t.price <= :maxPrice)
              and (:highVolume is null or t.volume >= :highVolume)
              and (:fromDate is null or t.trade_time::date >= date(:fromDate))
              and (:toDate is null or t.trade_time::date <= date(:toDate))
        )
        select f.side as side,
               count(*)::bigint as cnt,
               (select f2.price from filtered f2 where f2.side = f.side group by f2.price order by sum(f2.volume) desc, f2.price desc limit 1) as top_price,
               (select coalesce(sum(f3.volume)::bigint, 0) from filtered f3 where f3.side = f.side and f3.price = (select f4.price from filtered f4 where f4.side = f.side group by f4.price order by sum(f4.volume) desc, f4.price desc limit 1)) as top_volume
        from filtered f
        group by f.side
    """, nativeQuery = true)
    java.util.List<Object[]> statsBySide(
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

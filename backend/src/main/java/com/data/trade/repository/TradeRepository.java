package com.data.trade.repository;

import com.data.trade.model.Trade;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

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

    // Calculate volume statistics based on specifications
    @Query("SELECT COALESCE(SUM(t.volume), 0) FROM Trade t WHERE t.side = :side")
    Long sumVolumeBySide(@Param("side") String side);

    // Statistics queries for tracked stocks
    @Query("SELECT MIN(t.price) FROM Trade t WHERE t.code = :code AND t.side = :side AND t.tradeDate = :tradeDate")
    Optional<BigDecimal> findMinPriceByCodeAndSideAndDate(@Param("code") String code, @Param("side") String side, @Param("tradeDate") String tradeDate);

    @Query("SELECT MAX(t.price) FROM Trade t WHERE t.code = :code AND t.side = :side AND t.tradeDate = :tradeDate")
    Optional<BigDecimal> findMaxPriceByCodeAndSideAndDate(@Param("code") String code, @Param("side") String side, @Param("tradeDate") String tradeDate);

    @Query("SELECT MAX(t.volume) FROM Trade t WHERE t.code = :code AND t.side = :side AND t.tradeDate = :tradeDate")
    Optional<Long> findMaxVolumeByCodeAndSideAndDate(@Param("code") String code, @Param("side") String side, @Param("tradeDate") String tradeDate);

    /**
     * Get the latest transaction date from all trades
     * Returns the most recent trade_date in DD/MM/YYYY format
     */
    @Query(value = """
        SELECT trade_date
        FROM (
            SELECT DISTINCT trade_date,
                CAST(
                    SUBSTRING(trade_date, 7, 4) || 
                    SUBSTRING(trade_date, 4, 2) || 
                    SUBSTRING(trade_date, 1, 2)
                AS INTEGER) as date_int
            FROM trades
        ) AS distinct_dates
        ORDER BY date_int DESC
        LIMIT 1
        """, nativeQuery = true)
    Optional<String> findLatestTransactionDate();

    // Aggregate daily statistics grouped by tradeDate
    // Gets latest price of each day (based on latest trade_time)
    // PostgreSQL compatible query
    @Query(value = """
        WITH daily_agg AS (
            SELECT 
                t.trade_date,
                MIN(CAST(t.price AS DECIMAL)) as minPrice,
                MAX(CAST(t.price AS DECIMAL)) as maxPrice,
                SUM(t.volume) as totalVolume
            FROM trades t
            WHERE (:code IS NULL OR UPPER(t.code) = UPPER(:code))
              AND (:fromDateStr IS NULL OR 
                   CAST(
                     SUBSTRING(t.trade_date, 7, 4) || 
                     SUBSTRING(t.trade_date, 4, 2) || 
                     SUBSTRING(t.trade_date, 1, 2)
                   AS INTEGER) >= CAST(:fromDateStr AS INTEGER))
              AND (:toDateStr IS NULL OR 
                   CAST(
                     SUBSTRING(t.trade_date, 7, 4) || 
                     SUBSTRING(t.trade_date, 4, 2) || 
                     SUBSTRING(t.trade_date, 1, 2)
                   AS INTEGER) <= CAST(:toDateStr AS INTEGER))
            GROUP BY t.trade_date
        ),
        latest_prices AS (
            SELECT DISTINCT ON (t.trade_date)
                t.trade_date,
                t.price as latestPrice
            FROM trades t
            WHERE (:code IS NULL OR UPPER(t.code) = UPPER(:code))
              AND (:fromDateStr IS NULL OR 
                   CAST(
                     SUBSTRING(t.trade_date, 7, 4) || 
                     SUBSTRING(t.trade_date, 4, 2) || 
                     SUBSTRING(t.trade_date, 1, 2)
                   AS INTEGER) >= CAST(:fromDateStr AS INTEGER))
              AND (:toDateStr IS NULL OR 
                   CAST(
                     SUBSTRING(t.trade_date, 7, 4) || 
                     SUBSTRING(t.trade_date, 4, 2) || 
                     SUBSTRING(t.trade_date, 1, 2)
                   AS INTEGER) <= CAST(:toDateStr AS INTEGER))
            ORDER BY t.trade_date, t.trade_time DESC
        )
        SELECT 
            da.trade_date as date,
            lp.latestPrice,
            da.minPrice,
            da.maxPrice,
            da.totalVolume
        FROM daily_agg da
        LEFT JOIN latest_prices lp ON da.trade_date = lp.trade_date
        ORDER BY 
            CAST(
                SUBSTRING(da.trade_date, 7, 4) || 
                SUBSTRING(da.trade_date, 4, 2) || 
                SUBSTRING(da.trade_date, 1, 2)
            AS INTEGER) ASC
        """, nativeQuery = true)
    List<Object[]> findDailyStats(
            @Param("code") String code,
            @Param("fromDateStr") String fromDateStr,
            @Param("toDateStr") String toDateStr
    );

    /**
     * Get last 10 trading days of aggregated statistics for a stock
     * Returns: trade_date, close_price, open_price, high_price, low_price,
     *          buy_volume, sell_volume, total_volume,
     *          large_buy_blocks, large_sell_blocks, medium_buy_blocks, medium_sell_blocks
     */
    @Query(value = """
        WITH last_10_dates AS (
            SELECT DISTINCT 
                trade_date,
                CAST(
                    SUBSTRING(trade_date, 7, 4) || 
                    SUBSTRING(trade_date, 4, 2) || 
                    SUBSTRING(trade_date, 1, 2)
                AS INTEGER) as date_int
            FROM trades
            WHERE UPPER(code) = UPPER(:stockCode)
            ORDER BY date_int DESC
            LIMIT 10
        ),
        daily_aggregates AS (
            SELECT 
                t.trade_date,
                SUM(CASE WHEN t.side = 'buy' THEN t.volume ELSE 0 END) as buy_volume,
                SUM(CASE WHEN t.side = 'sell' THEN t.volume ELSE 0 END) as sell_volume,
                SUM(t.volume) as total_volume,
                SUM(CASE WHEN t.side = 'buy' AND t.volume >= 400000 THEN 1 ELSE 0 END) as large_buy_blocks,
                SUM(CASE WHEN t.side = 'sell' AND t.volume >= 400000 THEN 1 ELSE 0 END) as large_sell_blocks,
                SUM(CASE WHEN t.side = 'buy' AND t.volume >= 100000 AND t.volume < 400000 THEN 1 ELSE 0 END) as medium_buy_blocks,
                SUM(CASE WHEN t.side = 'sell' AND t.volume >= 100000 AND t.volume < 400000 THEN 1 ELSE 0 END) as medium_sell_blocks,
                MIN(CAST(t.price AS DECIMAL)) as low_price,
                MAX(CAST(t.price AS DECIMAL)) as high_price
            FROM trades t
            WHERE t.code = :stockCode
              AND t.trade_date IN (SELECT trade_date FROM last_10_dates)
            GROUP BY t.trade_date
        ),
        first_prices AS (
            SELECT 
                t.trade_date,
                t.price as open_price,
                ROW_NUMBER() OVER (PARTITION BY t.trade_date ORDER BY t.trade_time ASC) as rn
            FROM trades t
            WHERE t.code = :stockCode
              AND t.trade_date IN (SELECT trade_date FROM last_10_dates)
        ),
        first_prices_filtered AS (
            SELECT trade_date, open_price
            FROM first_prices
            WHERE rn = 1
        ),
        last_prices AS (
            SELECT 
                t.trade_date,
                t.price as close_price,
                ROW_NUMBER() OVER (PARTITION BY t.trade_date ORDER BY t.trade_time DESC) as rn
            FROM trades t
            WHERE t.code = :stockCode
              AND t.trade_date IN (SELECT trade_date FROM last_10_dates)
        ),
        last_prices_filtered AS (
            SELECT trade_date, close_price
            FROM last_prices
            WHERE rn = 1
        )
        SELECT 
            da.trade_date,
            COALESCE(lp.close_price, 0) as close_price,
            COALESCE(fp.open_price, 0) as open_price,
            da.high_price,
            da.low_price,
            da.buy_volume,
            da.sell_volume,
            da.total_volume,
            da.large_buy_blocks,
            da.large_sell_blocks,
            da.medium_buy_blocks,
            da.medium_sell_blocks
        FROM daily_aggregates da
        LEFT JOIN first_prices_filtered fp ON da.trade_date = fp.trade_date
        LEFT JOIN last_prices_filtered lp ON da.trade_date = lp.trade_date
        ORDER BY 
            CAST(
                SUBSTRING(da.trade_date, 7, 4) || 
                SUBSTRING(da.trade_date, 4, 2) || 
                SUBSTRING(da.trade_date, 1, 2)
            AS INTEGER) DESC
        """, nativeQuery = true)
    List<Object[]> findLast10DaysStats(@Param("stockCode") String stockCode);

    /**
     * Get daily OHLC (Open, High, Low, Close) data for a stock
     * Returns: code, trade_date, open_price, high_price, low_price, close_price
     */
    @Query(value = """
        WITH daily_aggregates AS (
            SELECT 
                t.code,
                t.trade_date,
                MIN(CAST(t.price AS DECIMAL)) AS low_price,
                MAX(CAST(t.price AS DECIMAL)) AS high_price
            FROM trades t
            WHERE UPPER(t.code) = UPPER(:code)
              AND (:fromDateStr IS NULL OR 
                   CAST(
                     SUBSTRING(t.trade_date, 7, 4) || 
                     SUBSTRING(t.trade_date, 4, 2) || 
                     SUBSTRING(t.trade_date, 1, 2)
                   AS INTEGER) >= CAST(:fromDateStr AS INTEGER))
              AND (:toDateStr IS NULL OR 
                   CAST(
                     SUBSTRING(t.trade_date, 7, 4) || 
                     SUBSTRING(t.trade_date, 4, 2) || 
                     SUBSTRING(t.trade_date, 1, 2)
                   AS INTEGER) <= CAST(:toDateStr AS INTEGER))
            GROUP BY t.code, t.trade_date
        ),
        first_prices AS (
            SELECT 
                t.trade_date,
                CAST(t.price AS DECIMAL) AS open_price,
                ROW_NUMBER() OVER (PARTITION BY t.trade_date ORDER BY t.trade_time ASC) as rn
            FROM trades t
            WHERE UPPER(t.code) = UPPER(:code)
              AND (:fromDateStr IS NULL OR 
                   CAST(
                     SUBSTRING(t.trade_date, 7, 4) || 
                     SUBSTRING(t.trade_date, 4, 2) || 
                     SUBSTRING(t.trade_date, 1, 2)
                   AS INTEGER) >= CAST(:fromDateStr AS INTEGER))
              AND (:toDateStr IS NULL OR 
                   CAST(
                     SUBSTRING(t.trade_date, 7, 4) || 
                     SUBSTRING(t.trade_date, 4, 2) || 
                     SUBSTRING(t.trade_date, 1, 2)
                   AS INTEGER) <= CAST(:toDateStr AS INTEGER))
        ),
        first_prices_filtered AS (
            SELECT trade_date, open_price
            FROM first_prices
            WHERE rn = 1
        ),
        last_prices AS (
            SELECT 
                t.trade_date,
                CAST(t.price AS DECIMAL) AS close_price,
                ROW_NUMBER() OVER (PARTITION BY t.trade_date ORDER BY t.trade_time DESC) as rn
            FROM trades t
            WHERE UPPER(t.code) = UPPER(:code)
              AND (:fromDateStr IS NULL OR 
                   CAST(
                     SUBSTRING(t.trade_date, 7, 4) || 
                     SUBSTRING(t.trade_date, 4, 2) || 
                     SUBSTRING(t.trade_date, 1, 2)
                   AS INTEGER) >= CAST(:fromDateStr AS INTEGER))
              AND (:toDateStr IS NULL OR 
                   CAST(
                     SUBSTRING(t.trade_date, 7, 4) || 
                     SUBSTRING(t.trade_date, 4, 2) || 
                     SUBSTRING(t.trade_date, 1, 2)
                   AS INTEGER) <= CAST(:toDateStr AS INTEGER))
        ),
        last_prices_filtered AS (
            SELECT trade_date, close_price
            FROM last_prices
            WHERE rn = 1
        )
        SELECT 
            da.code,
            da.trade_date,
            COALESCE(fp.open_price, 0) AS open_price,
            da.high_price,
            da.low_price,
            COALESCE(lp.close_price, 0) AS close_price
        FROM daily_aggregates da
        LEFT JOIN first_prices_filtered fp ON da.trade_date = fp.trade_date
        LEFT JOIN last_prices_filtered lp ON da.trade_date = lp.trade_date
        ORDER BY 
            CAST(
                SUBSTRING(da.trade_date, 7, 4) || 
                SUBSTRING(da.trade_date, 4, 2) || 
                SUBSTRING(da.trade_date, 1, 2)
            AS INTEGER) ASC
        """, nativeQuery = true)
    List<Object[]> findDailyOHLC(
            @Param("code") String code,
            @Param("fromDateStr") String fromDateStr,
            @Param("toDateStr") String toDateStr
    );

    /**
     * Get intraday price data for a stock on a specific date
     * Groups trades into 10-minute intervals and calculates average, min, max prices and total volume
     * Returns: time_interval (HH:mm), avg_price, min_price, max_price, total_volume
     * Trading session: 09:15:00 - 15:00:00
     * Groups by rounding down minutes to nearest 10 (e.g., 09:23 -> 09:20, 09:47 -> 09:40)
     */
    @Query(value = """
        SELECT 
            SUBSTRING(t.trade_time, 1, 2) || ':' || 
            CASE 
                WHEN (CAST(SUBSTRING(t.trade_time, 4, 2) AS INTEGER) / 10) * 10 < 10 THEN
                    '0' || CAST((CAST(SUBSTRING(t.trade_time, 4, 2) AS INTEGER) / 10) * 10 AS TEXT)
                ELSE
                    CAST((CAST(SUBSTRING(t.trade_time, 4, 2) AS INTEGER) / 10) * 10 AS TEXT)
            END AS time_interval,
            AVG(CAST(t.price AS DECIMAL)) AS avg_price,
            MIN(CAST(t.price AS DECIMAL)) AS min_price,
            MAX(CAST(t.price AS DECIMAL)) AS max_price,
            SUM(t.volume) AS total_volume
        FROM trades t
        WHERE UPPER(t.code) = UPPER(:code)
          AND t.trade_date = :tradeDate
          AND t.trade_time >= '09:15:00'
          AND t.trade_time <= '15:00:00'
        GROUP BY SUBSTRING(t.trade_time, 1, 2), 
                 (CAST(SUBSTRING(t.trade_time, 4, 2) AS INTEGER) / 10) * 10
        ORDER BY 1
        """, nativeQuery = true)
    List<Object[]> findIntradayPriceData(
            @Param("code") String code,
            @Param("tradeDate") String tradeDate
    );
}

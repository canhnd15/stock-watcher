# Weekend Signal Calculation - Implementation Guide

## Problem Statement

The original implementation calculated signals based on the **current time minus 30 minutes**:
```java
OffsetDateTime since = OffsetDateTime.now().minusMinutes(30);
```

This caused issues on **weekends and holidays** because:
- Stock markets are closed on Saturday and Sunday
- No new trades are recorded
- Signal calculation would find no data and return null
- No signals would be generated even though Friday's data is available

## Solution

The updated implementation uses the **latest available trade time** as the reference point:

### Changes Made

#### 1. TradeRepository.java - Added New Query Methods

```java
// Find the most recent trade for a stock code
Trade findFirstByCodeOrderByTradeTimeDesc(String code);

// Find trades in a specific time range
List<Trade> findByCodeAndTradeTimeBetween(String code, OffsetDateTime start, OffsetDateTime end);
```

#### 2. SignalCalculationService.java - Updated Logic

**Before:**
```java
// Get trades from last 30 minutes from NOW
OffsetDateTime since = OffsetDateTime.now().minusMinutes(30);
List<Trade> recentTrades = tradeRepository.findByCodeAndTradeTimeAfter(code, since);
```

**After:**
```java
// Find the latest trade for this stock code
Trade latestTrade = tradeRepository.findFirstByCodeOrderByTradeTimeDesc(code);

if (latestTrade == null) {
    log.debug("No trades found for code: {}", code);
    return null;
}

// Use the latest trade time as reference point instead of current time
// This allows signal calculation to work on weekends with Friday's data
OffsetDateTime latestTradeTime = latestTrade.getTradeTime();
OffsetDateTime since = latestTradeTime.minusMinutes(30);

// Get trades from last 30 minutes before the latest trade
List<Trade> recentTrades = tradeRepository.findByCodeAndTradeTimeBetween(code, since, latestTradeTime);
```

## How It Works

### Scenario 1: During Trading Hours (Monday-Friday)
```
Current Time: 2025-10-26 14:30:00 (Friday)
Latest Trade: 2025-10-26 14:29:00 (Friday)
Time Window:  2025-10-26 13:59:00 to 14:29:00

✅ Calculates signals using the most recent 30 minutes of trades
```

### Scenario 2: On Weekend
```
Current Time:    2025-10-27 10:00:00 (Saturday)
Latest Trade:    2025-10-25 15:00:00 (Friday - last trading day)
Time Window:     2025-10-25 14:30:00 to 15:00:00

✅ Still calculates signals using Friday's data
✅ Signals remain relevant for weekend analysis
```

### Scenario 3: On Monday Morning (Before Market Opens)
```
Current Time:    2025-10-28 08:00:00 (Monday morning)
Latest Trade:    2025-10-25 15:00:00 (Friday - last trading day)
Time Window:     2025-10-25 14:30:00 to 15:00:00

✅ Shows Friday's signals until new trades come in
```

## Benefits

### 1. Continuous Signal Availability
- Signals are available 24/7, even on weekends
- No gaps in signal generation
- Better for analysis and review

### 2. Accurate Historical Analysis
- Uses actual trading data, not arbitrary time windows
- Respects market hours and closures
- More relevant signal calculations

### 3. Flexibility for Different Markets
- Works with markets in different timezones
- Handles holidays automatically
- No manual configuration needed

### 4. Better User Experience
- Users can review signals any time
- No confusion about missing signals on weekends
- Consistent behavior across all days

## Example Calculation Flow

Let's say we're analyzing **VNM** stock on **Saturday, October 26, 2025**:

```
Step 1: Find Latest Trade
-------
Query: SELECT * FROM trades WHERE code = 'VNM' ORDER BY trade_time DESC LIMIT 1
Result: trade_time = '2025-10-25 14:58:00+07' (Friday, 2:58 PM)

Step 2: Calculate Time Window
-------
Latest Trade Time: 2025-10-25 14:58:00
Since:             2025-10-25 14:28:00 (30 minutes before)

Step 3: Get Recent Trades
-------
Query: SELECT * FROM trades 
       WHERE code = 'VNM' 
       AND trade_time BETWEEN '2025-10-25 14:28:00' AND '2025-10-25 14:58:00'
Result: 150 trades found

Step 4: Analyze Trades
-------
Buy Volume:  450,000 shares
Sell Volume: 850,000 shares
Ratio:       1.89x (Sell pressure)
Large Sell Blocks: 3

Step 5: Calculate Score
-------
- Volume imbalance: +3 points (Sell > Buy × 1.5)
- Strong imbalance: +2 points (Sell > Buy × 3)
- Large blocks: +2 points (≥2 large sell blocks)
Total Sell Score: 7 points

Step 6: Generate Signal
-------
Signal Type: SELL
Score: 7
Reason: "Strong sell pressure detected! Sell volume: 850,000 vs Buy: 450,000 (Ratio: 1.89x). 
         Large sell blocks: 3. Price change: -1.2%. Total trades: 150"

Step 7: Broadcast
-------
Send signal to WebSocket topic: /topic/signals
```

## Testing

### Test Case 1: Normal Trading Day
```bash
# Insert test data for current date
curl -X POST http://localhost:8080/api/trades/ingest/VNM

# Check signals (should use current data)
# Check backend logs for "Signal sent" messages
```

### Test Case 2: Weekend with Friday's Data
```bash
# Ensure database has Friday's data
# Run on Saturday/Sunday
./mvnw spring-boot:run

# Wait for cron job (every 5 minutes)
# Or manually trigger signal calculation

# Check logs:
# Should see: "No recent trades found..." if time window is empty
# Or: "Signal sent: SELL for VNM (score: 7)" if signals detected
```

### Test Case 3: Multiple Stocks
```bash
# Ingest data for multiple stocks
curl -X POST http://localhost:8080/api/trades/ingest/all

# Each stock will use its own latest trade time
# Signals calculated independently for each stock
```

## Database Query Examples

### Find Latest Trade for Each Stock
```sql
SELECT DISTINCT ON (code) 
    code, 
    trade_time, 
    price, 
    volume, 
    side
FROM trades
ORDER BY code, trade_time DESC;
```

### Get Trades in Last 30 Minutes from Latest Trade
```sql
WITH latest AS (
    SELECT code, MAX(trade_time) as max_time
    FROM trades
    WHERE code = 'VNM'
    GROUP BY code
)
SELECT t.*
FROM trades t
JOIN latest l ON t.code = l.code
WHERE t.trade_time BETWEEN (l.max_time - INTERVAL '30 minutes') AND l.max_time
ORDER BY t.trade_time DESC;
```

## Customization Options

### Adjust Time Window

You can easily change the time window from 30 minutes to any duration:

```java
// 15 minutes
OffsetDateTime since = latestTradeTime.minusMinutes(15);

// 1 hour
OffsetDateTime since = latestTradeTime.minusHours(1);

// End of trading day (last 30 min of the day)
OffsetDateTime since = latestTradeTime.minusMinutes(30);
```

### Use Multiple Time Windows

For more sophisticated analysis:

```java
// Analyze both short-term and medium-term
List<Trade> shortTerm = tradeRepository.findByCodeAndTradeTimeBetween(
    code, 
    latestTradeTime.minusMinutes(15), 
    latestTradeTime
);

List<Trade> mediumTerm = tradeRepository.findByCodeAndTradeTimeBetween(
    code, 
    latestTradeTime.minusMinutes(60), 
    latestTradeTime
);
```

## Monitoring

### Log Messages to Watch

**Success:**
```
INFO  SignalCalculationService - Running signal calculation job...
INFO  SignalCalculationService - Found 25 distinct stock codes
INFO  SignalCalculationService - Signal sent: SELL for VNM (score: 7)
INFO  SignalCalculationService - Signal calculation completed. Sent 3 signals
```

**No Data:**
```
DEBUG SignalCalculationService - No trades found for code: XYZ
DEBUG SignalCalculationService - No recent trades found for code: ABC in last 30 minutes from 2025-10-25T15:00:00+07:00
```

## Performance Considerations

### Optimizations
1. **Index on (code, trade_time DESC)** - Already exists in Trade entity
2. **Limit query results** - Only fetches trades in the time window
3. **Caching** - Could cache latest trade time per stock

### Query Performance
```sql
-- Efficient query with index
EXPLAIN ANALYZE
SELECT * FROM trades 
WHERE code = 'VNM' 
ORDER BY trade_time DESC 
LIMIT 1;

-- Should use: Index Scan on idx_trades_code_time
-- Execution time: < 1ms
```

## Troubleshooting

### Issue: No Signals on Weekend

**Check:**
1. Verify trades exist for the stock:
   ```sql
   SELECT code, MAX(trade_time) FROM trades WHERE code = 'VNM' GROUP BY code;
   ```

2. Check time window has trades:
   ```sql
   SELECT COUNT(*) FROM trades 
   WHERE code = 'VNM' 
   AND trade_time >= (SELECT MAX(trade_time) - INTERVAL '30 minutes' FROM trades WHERE code = 'VNM');
   ```

3. Check backend logs for debug messages

### Issue: Stale Signals

**Reason:** Latest trade is too old (e.g., data from last week)

**Solution:** Add additional check for trade age:
```java
// Only calculate signals if latest trade is within 7 days
Duration age = Duration.between(latestTradeTime, OffsetDateTime.now());
if (age.toDays() > 7) {
    log.debug("Latest trade for {} is too old: {} days", code, age.toDays());
    return null;
}
```

## Migration Notes

### No Database Migration Needed
- Uses existing tables and columns
- Only adds new query methods to repository
- Backward compatible with existing data

### Deployment Steps
1. Update code (already done)
2. Restart Spring Boot application
3. Verify logs show new calculation logic
4. Test with weekend data

## Summary

✅ **Problem Solved:** Signals now work on weekends and holidays
✅ **No Data Loss:** Uses the latest available trading data
✅ **Better UX:** Consistent signal availability
✅ **Flexible:** Works with any market schedule
✅ **Performant:** Efficient database queries
✅ **Maintainable:** Clean, well-documented code

The implementation is production-ready and requires no additional configuration!


# Cron-Jobs Service - Stock Watcher

Scheduled tasks service for Stock Watcher application. Handles all periodic jobs including data ingestion, signal calculation, and notifications.

## 📋 Overview

The cron-jobs service is a dedicated Spring Boot application that runs scheduled tasks independently from the backend API service. It:
- Fetches trade data from external APIs
- Calculates buy/sell signals
- Refreshes tracked stocks and generates recommendations
- Calculates statistics
- Sends notifications

## 🚀 Quick Start

```bash
# Build
mvn clean package

# Run
mvn spring-boot:run

# Service runs on http://localhost:8898
# Note: No REST APIs exposed, service only runs scheduled tasks
```

## ⏰ Scheduled Jobs

### 1. VN30 Ingestion (Every 5 minutes)
- **Schedule**: `0 */5 * * * *`
- **Job**: `ingestAllVn30Stocks()`
- **Purpose**: Fetches trade data for all VN30 stocks from external API
- **After completion**: Triggers signal calculation and statistics calculation

### 2. Tracked Stocks Refresh (Every 5 minutes)
- **Schedule**: `0 */5 * * * *`
- **Job**: `refreshTodayAndRecommend()`
- **Purpose**: Refreshes tracked stocks and generates recommendations
- **For each tracked stock**: Deletes old data, ingests new data, generates recommendation

### 3. Tracked Stocks Notifications (Every 3 minutes)
- **Schedule**: `0 */3 * * * *`
- **Job**: `checkTrackedStocksNotifications()`
- **Purpose**: Checks for BIG signals and sends notifications via WebSocket

### 4. Signal Calculation
- **Triggered**: After VN30 ingestion completes
- **Method**: `signalCalculationService.calculateAndNotifySignals()`
- **Purpose**: Calculates buy/sell signals for tracked stocks and sends via WebSocket

### 5. Statistics Calculation
- **Triggered**: After VN30 ingestion completes
- **Method**: `trackedStockStatsService.calculateStatsForAllTrackedStocks()`
- **Purpose**: Calculates statistics for tracked stocks

## 🔧 Configuration

See `src/main/resources/application.properties`:

```properties
# Service port (not used for REST, just for Spring Boot app)
server.port=8898

# Shared database connection (same as backend)
spring.datasource.url=jdbc:postgresql://localhost:5433/trade

# Cron job schedules
cron.vn30-ingestion=0 */5 * * * *
cron.tracked-stocks-refresh=0 */5 * * * *
cron.tracked-stock.notify=0 */3 * * * *

# External API
app.finpath.base-url=https://api.finpath.vn
```

## 📦 Dependencies

- Spring Boot 3.5.6
- Spring Data JPA (PostgreSQL)
- Spring WebFlux (HTTP client for external APIs)
- Spring WebSocket (for sending signals via SimpMessagingTemplate)
- Spring Security (minimal, only for User model dependencies)

## 🗄️ Database Access

This service connects to the **same PostgreSQL database** as the backend service:
- **Shared Tables**: `trades`, `tracked_stocks`, `users`, `app_config`
- **Operations**: Read and write access to all tables
- **No Conflicts**: Scheduled tasks run at specific intervals, no concurrent issues

## ⚠️ WebSocket Messaging Limitation

**Current Issue**: This service has its own in-memory message broker. Messages sent via `SimpMessagingTemplate` go to this service's broker, not the backend's broker. Clients connected to the backend WebSocket server won't receive signals sent from this service.

**Solutions**:
1. **Recommended**: Configure shared Redis/RabbitMQ message broker
2. **Alternative**: Call backend REST API to trigger signal calculation
3. **Future**: Use external message broker (Redis/RabbitMQ) for shared messaging

## 🔄 Service Independence

This service is **completely independent** from the backend:
- ✅ Can be deployed separately
- ✅ Can be scaled independently
- ✅ Can be restarted without affecting backend
- ✅ Runs on different port (8898 vs 8080)
- ✅ No REST APIs exposed
- ✅ Minimal security (no authentication needed)

## 📊 Monitoring

Check logs for scheduled job execution:
- Each job logs start/completion time
- Success/failure counts
- Error details if any job fails

## 🔧 Enabling/Disabling Jobs

Jobs can be enabled/disabled via database configuration (managed by `ConfigService`):
- `vn30.cron.enabled` - Enable/disable VN30 ingestion
- `tracked.stocks.cron.enabled` - Enable/disable tracked stocks refresh
- `signal.calculation.cron.enabled` - Enable/disable signal calculation

Default: All jobs are enabled.

## 🐛 Troubleshooting

### Issue: Jobs not running
- Check logs for errors
- Verify database connection
- Check job schedules in `application.properties`
- Verify jobs are not disabled in database (`app_config` table)

### Issue: Data not ingested
- Check external API connection (`app.finpath.base-url`)
- Verify API credentials if needed
- Check logs for HTTP errors

### Issue: Signals not received by clients
- This is expected due to separate message brokers (see limitation above)
- Configure shared Redis/RabbitMQ broker for production

### Issue: Database connection errors
- Verify PostgreSQL is running on port 5433
- Check database credentials
- Ensure database exists and is accessible


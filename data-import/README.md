# Data Import Service - Stock Watcher

Batch data import service for importing trade data from XLSX files into the database.

## Overview

This service handles bulk import of historical trade data from XLSX files. It uses Spring Batch to process large files efficiently with chunk-based processing.

## Quick Start

### Prerequisites

- Java 21
- Maven 3.8+
- PostgreSQL database (same as backend/cron-jobs)
- XLSX files with trade data

### Build

```bash
cd data-import
mvn clean package
```

### Run

```bash
# Import all XLSX files from a directory
java -jar target/data-import-0.0.1-SNAPSHOT.jar import /path/to/xlsx/files

# Or with environment variables
DB_URL=jdbc:postgresql://localhost:5433/trade \
DB_USERNAME=postgre \
DB_PASSWORD=admin \
java -jar target/data-import-0.0.1-SNAPSHOT.jar import /path/to/xlsx/files
```

## Commands

### Import Files

Import all XLSX files from a directory to the staging table:

```bash
java -jar data-import.jar import [directory-path]
```

- Default directory: `./data/trades`
- Processes files sequentially
- Skips invalid rows (logs warnings)
- Stores data in `trades_staging` table

### Migrate to Main Table

After importing, migrate data from staging to main table:

```bash
java -jar data-import.jar migrate
```

- Deduplicates records (based on code, date, time)
- Only inserts records that don't already exist
- Uses native SQL for performance

### Cleanup Staging

Truncate the staging table:

```bash
java -jar data-import.jar cleanup
```

### Full Workflow

Run complete workflow: import → migrate → cleanup:

```bash
java -jar data-import.jar full [directory-path]
```

## Data Format

XLSX files should have one of the following structures:

### Format 1: Import Format (Default)
| Column | Index | Format | Example |
|--------|-------|--------|---------|
| Code | 1 | String | "ACB" |
| Price | 2 | Number | 25000.5 |
| Side | 3 | String | "buy" / "sell" / "other" |
| Date | 4 | String | "24/10/2025" (DD/MM/YYYY) |
| Time | 5 | String | "14:45:00" (HH:mm:ss) |
| Volume | 6 | Number | 1000 |

### Format 2: Export Format (Also Supported)
| Column | Index | Format | Example |
|--------|-------|--------|---------|
| Time | 0 | String | "14:45:00" (HH:mm:ss) |
| Date | 1 | String | "24/10/2025" (DD/MM/YYYY) |
| Code | 2 | String | "ACB" |
| Side | 3 | String | "buy" / "sell" / "other" |
| Price | 4 | Number | 25000.5 |
| Volume | 5 | Number | 1000 |

**Note**: 
- The first row is treated as header and skipped
- The reader automatically detects which format is used

## Import Process Flow

```
1. File Discovery
   └─> Scan directory for *.xlsx files
   
2. Batch Processing (per file)
   └─> ExcelTradeItemReader reads rows in chunks (5000)
   └─> TradeStagingItemProcessor validates/normalizes
   └─> TradeStagingItemWriter batch inserts to staging
   
3. Migration (optional)
   └─> Move data from trades_staging to trades
   └─> Deduplication based on (code, date, time)
   
4. Cleanup (optional)
   └─> Truncate trades_staging table
```

## Configuration

### Application Properties

Edit `src/main/resources/application.properties`:

```properties
# Database
spring.datasource.url=jdbc:postgresql://localhost:5433/trade
spring.datasource.username=postgre
spring.datasource.password=admin

# Batch chunk size (adjust based on memory)
spring.jpa.properties.hibernate.jdbc.batch_size=5000
```

### Environment Variables

You can override database settings:

```bash
export DB_URL=jdbc:postgresql://localhost:5433/trade
export DB_USERNAME=postgre
export DB_PASSWORD=admin
```

## Performance

- **Chunk Size**: 5000 records per chunk
- **Processing Speed**: ~2-5 minutes per file (50K-60K records)
- **Memory Usage**: Low (chunk-based processing)
- **Error Handling**: Skips invalid rows, continues processing

## Database Tables

### trades_staging (Temporary)

Staging table for bulk inserts:

```sql
CREATE TABLE trades_staging (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(16) NOT NULL,
    price NUMERIC NOT NULL,
    volume BIGINT NOT NULL,
    side VARCHAR(8) NOT NULL,
    trade_date VARCHAR(10) NOT NULL,
    trade_time VARCHAR(8) NOT NULL
);
```

### trades (Main Table)

Final destination table (shared with backend/cron-jobs).

## Monitoring

### Logs

The service logs:
- File processing progress
- Chunk write operations
- Migration statistics
- Error details

### Spring Batch Metadata

Spring Batch creates metadata tables:
- `BATCH_IMPORT_JOB_INSTANCE`
- `BATCH_IMPORT_JOB_EXECUTION`
- `BATCH_IMPORT_STEP_EXECUTION`

Query these tables to track job progress.

## Important Notes

1. **One-time Use**: This service is designed for initial data import during setup
2. **Staging Table**: Data is first imported to `trades_staging`, then migrated
3. **Deduplication**: Migration step automatically deduplicates records
4. **File Format**: Ensure XLSX files match the expected column structure
5. **Database**: Must have `trades_staging` table created (via Flyway migration)

## Troubleshooting

### No files found
- Check directory path
- Ensure files have `.xlsx` extension

### Import errors
- Check file format matches expected structure
- Verify database connection
- Check logs for specific error messages

### Migration issues
- Ensure staging table has data
- Check for duplicate records in main table
- Verify database permissions

## Example Workflow

```bash
# 1. Place all XLSX files in a directory
mkdir -p ./data/trades
# Copy your XLSX files to ./data/trades/

# 2. Import all files
java -jar data-import.jar import ./data/trades

# 3. Check staging count (optional)
# Query: SELECT COUNT(*) FROM trades_staging;

# 4. Migrate to main table
java -jar data-import.jar migrate

# 5. Cleanup staging
java -jar data-import.jar cleanup

# Or run all at once:
java -jar data-import.jar full ./data/trades
```

## Related Services

- **Backend**: REST API service (port 8899)
- **Cron-Jobs**: Scheduled tasks service (port 8898)
- **Frontend**: React UI (port 8089)

All services share the same PostgreSQL database.


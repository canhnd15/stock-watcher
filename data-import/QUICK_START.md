# Data Import Service - Quick Start Guide

## 🚀 Quick Start

### 1. Build the Service

```bash
cd data-import
mvn clean package
```

This creates: `target/data-import-0.0.1-SNAPSHOT.jar`

### 2. Prepare Your XLSX Files

Place all your XLSX files in a directory. The files should contain trade data with columns:
- Code, Price, Side, Date, Time, Volume

Example structure:
```
/data/trades/
  ├── trades_2024-11-01.xlsx
  ├── trades_2024-11-02.xlsx
  ├── trades_2024-11-03.xlsx
  └── ...
```

### 3. Run the Import

#### Option A: Full Workflow (Recommended)
```bash
java -jar target/data-import-0.0.1-SNAPSHOT.jar full /path/to/xlsx/files
```

This will:
1. Import all files to staging table
2. Migrate to main table (with deduplication)
3. Clean up staging table

#### Option B: Step by Step

```bash
# Step 1: Import to staging
java -jar target/data-import-0.0.1-SNAPSHOT.jar import /path/to/xlsx/files

# Step 2: Check staging count (optional)
# Connect to database and run: SELECT COUNT(*) FROM trades_staging;

# Step 3: Migrate to main table
java -jar target/data-import-0.0.1-SNAPSHOT.jar migrate

# Step 4: Cleanup staging
java -jar target/data-import-0.0.1-SNAPSHOT.jar cleanup
```

### 4. With Environment Variables

```bash
export DB_URL=jdbc:postgresql://localhost:5433/trade
export DB_USERNAME=postgre
export DB_PASSWORD=admin

java -jar target/data-import-0.0.1-SNAPSHOT.jar full /path/to/xlsx/files
```

## 📊 Expected Performance

- **Files**: ~90-120 files (Nov to Now)
- **Records per file**: ~50K-60K
- **Total records**: ~4.5M-7.2M
- **Processing time**: ~2-5 minutes per file
- **Total time**: ~3-10 hours (depending on hardware)

## ✅ Verification

After import, verify the data:

```sql
-- Check total records in main table
SELECT COUNT(*) FROM trades;

-- Check records by date
SELECT trade_date, COUNT(*) 
FROM trades 
GROUP BY trade_date 
ORDER BY trade_date;

-- Check records by stock code
SELECT code, COUNT(*) 
FROM trades 
GROUP BY code 
ORDER BY COUNT(*) DESC 
LIMIT 10;
```

## 🔧 Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running
- Check database credentials
- Ensure `trades_staging` table exists (created by Flyway migration)

### File Format Issues
- Ensure files are `.xlsx` format
- Check column order matches expected format
- Verify first row is header (will be skipped)

### Memory Issues
- Reduce chunk size in `application.properties`:
  ```properties
  spring.jpa.properties.hibernate.jdbc.batch_size=3000
  ```

## 📝 Notes

- The service processes files sequentially to avoid memory issues
- Invalid rows are skipped (warnings logged)
- Deduplication happens during migration step
- Staging table is cleaned up after migration


# Google Drive Backup Setup Guide

## Overview
The backup job runs daily at 15:05 (3:05 PM) on weekdays (Monday-Friday) to export and upload trades data to Google Drive.

## Setup Steps

### 1. Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Drive API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Drive API"
   - Click "Enable"

### 2. Create OAuth 2.0 Credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client ID"
3. If prompted, configure the OAuth consent screen:
   - Choose "External" user type
   - Fill in required information
   - Add scopes: `.../auth/drive.file`
   - Save and continue
4. Create OAuth 2.0 Client ID:
   - Application type: **Desktop application**
   - Name: "Stock Watcher Backup" (or any name)
   - Click "Create"
5. Download the credentials JSON file
6. Rename it to `credentials.json` and place it in the `cron-jobs` directory (same level as `pom.xml`)

### 3. Get Google Drive Folder ID
1. Create a folder in Google Drive (or use an existing one)
2. Open the folder in Google Drive
3. Look at the URL: `https://drive.google.com/drive/folders/FOLDER_ID_HERE`
4. Copy the folder ID (the long string after `/folders/`)
5. Update `application.properties`:
   ```properties
   google.drive.folder.id=YOUR_FOLDER_ID_HERE
   ```

### 4. First-Time Authorization
1. Start the cron-jobs application
2. On first run, the application will:
   - Open a browser window for authorization
   - Ask you to sign in with your Google account
   - Request permission to access Google Drive
3. Authorize the application
4. Tokens will be stored in the `tokens` directory (created automatically)

### 5. Configuration
Update `cron-jobs/src/main/resources/application.properties`:
```properties
# Google Drive configuration
google.drive.credentials.path=credentials.json
google.drive.folder.id=YOUR_FOLDER_ID_HERE
```

## How It Works

1. **Schedule**: Runs at 15:05 every weekday (Monday-Friday)
2. **Data Export**: Queries all trades from the `trades` table for the current day
3. **File Format**: Exports to Excel (.xlsx) format
4. **Filename**: `trades-backup-YYYY-MM-DD.xlsx` (e.g., `trades-backup-2024-01-15.xlsx`)
5. **Upload**: Uploads the file to the configured Google Drive folder
6. **Logging**: Logs success/failure with file ID on success

## Enable/Disable Backup Job

The backup job can be enabled/disabled via the `backup.cron.enabled` configuration in the database:
- Default: Enabled (true)
- To disable: Set `backup.cron.enabled` to `false` in the `app_config` table

## Troubleshooting

### Credentials File Not Found
- Ensure `credentials.json` is in the `cron-jobs` directory
- Or update `google.drive.credentials.path` in `application.properties` with the full path

### Authorization Failed
- Make sure you've enabled Google Drive API in Google Cloud Console
- Check that the OAuth consent screen is properly configured
- Verify the credentials.json file is valid

### Upload Failed
- Check that the folder ID is correct
- Ensure the Google account has write access to the folder
- Check application logs for detailed error messages

### No Trades Found
- The job will skip upload if no trades are found for the current day
- This is expected behavior and will be logged as a warning



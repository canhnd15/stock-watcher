# WebSocket Signal Notifications - React Implementation

## Overview
Real-time buy/sell signal notifications for stock trading using WebSocket communication between Spring Boot backend and React frontend.

## What Was Implemented

### Backend (Spring Boot)

1. **WebSocketConfig.java** - `/src/main/java/com/data/trade/config/`
   - STOMP over WebSocket configuration
   - Endpoint: `/ws`
   - Supports both localhost:4200 (Angular) and localhost:5173 (Vite/React)
   - SockJS fallback enabled

2. **SignalNotification.java** - `/src/main/java/com/data/trade/dto/`
   - DTO containing: code, signalType, reason, volumes, price, timestamp, score, priceChange

3. **SignalCalculationService.java** - `/src/main/java/com/data/trade/service/`
   - Scheduled job (every 5 minutes): `@Scheduled(cron = "0 */5 * * * *")`
   - Analyzes last 30 minutes of trades
   - Multi-factor scoring algorithm:
     - **Volume Imbalance** (3-5 points): Buy/Sell volume ratio
     - **Large Block Trades** (2-3 points): Trades ≥100k shares
     - **Price Momentum** (1-2 points): Price change percentage
   - Minimum score: 4 points to trigger signal
   - Broadcasts to `/topic/signals`

4. **TradeRepository.java** - Updated
   - Added `findDistinctCodes()` - Get all stock codes
   - Added `findByCodeAndTradeTimeAfter()` - Get recent trades

5. **pom.xml** - Updated
   - Added `spring-boot-starter-websocket` dependency

### Frontend (React + TypeScript + Vite + shadcn/ui)

1. **useWebSocket.ts** - `/frontend/src/hooks/`
   - Custom React hook for WebSocket connection
   - Auto-connect on mount
   - Auto-reconnect on disconnect
   - Signal state management
   - Browser notification support

2. **Notifications.tsx** - `/frontend/src/components/`
   - Real-time notification UI
   - Connection status indicator
   - Signal history (last 15 signals)
   - Beautiful animations using Tailwind CSS
   - Color-coded: Green for BUY, Red for SELL
   - Signal score display
   - Clear all functionality

3. **App.tsx** - Updated
   - Integrated `<Notifications />` component

4. **package.json** - Updated
   - Added `@stomp/stompjs@^7.0.0`
   - Added `sockjs-client@^1.6.1`
   - Added `@types/sockjs-client@^1.5.4`

## Setup Instructions

### 1. Install Dependencies

**Backend:**
```bash
cd /Users/canhnd/Desktop/code/microservices/spring/stock-watcher
./mvnw clean install
```

**Frontend:**
```bash
cd frontend
npm install
```

### 2. Start Services

**Start PostgreSQL:**
```bash
docker-compose up -d
```

**Start Backend (Terminal 1):**
```bash
./mvnw spring-boot:run
```
Backend runs on: `http://localhost:8080`

**Start Frontend (Terminal 2):**
```bash
cd frontend
npm run dev
```
Frontend runs on: `http://localhost:5173`

### 3. Test the Feature

#### Option 1: Manual Ingestion
1. Open `http://localhost:5173`
2. Go to "Trades" page
3. Enter a stock code (e.g., VNM, FPT, VCB) in "Ingest code" field
4. Click "Ingest Now"

#### Option 2: API Call
```bash
curl -X POST http://localhost:8080/api/trades/ingest/VNM
```

#### Option 3: Wait for Scheduled Job
The cron job runs every 5 minutes automatically.

### 4. Verify WebSocket Connection

Open browser console (F12) and look for:
```
✅ WebSocket Connected
📡 Subscribed to /topic/signals
```

When a signal is detected:
```
📊 Signal received: {code: "VNM", signalType: "SELL", ...}
```

## Signal Calculation Algorithm

### Scoring System

**Volume Imbalance (3-5 points):**
- Buy > Sell × 1.5 AND Buy > 50k: +3 points
- Buy > Sell × 3 AND Buy > 100k: +2 additional points
- Sell > Buy × 1.5 AND Sell > 50k: +3 points (Sell score)
- Sell > Buy × 3 AND Sell > 100k: +2 additional points (Sell score)

**Large Block Trades (2-3 points):**
- Buy blocks ≥ 100k count ≥ 2: +2 points
- Buy blocks ≥ 100k count ≥ 5: +1 additional point
- Sell blocks ≥ 100k count ≥ 2: +2 points (Sell score)
- Sell blocks ≥ 100k count ≥ 5: +1 additional point (Sell score)

**Price Momentum (1-2 points):**
- Price change > +0.5%: +1 point
- Price change > +2.0%: +1 additional point
- Price change < -0.5%: +1 point (Sell score)
- Price change < -2.0%: +1 additional point (Sell score)

**Signal Threshold:**
- Minimum score: 4 points
- Must be stronger than opposite signal
- Minimum total volume: 50,000 shares

### Example Analysis

Using your VNM data (658,900 sell at 58,100):
```
Total Sell Volume: 664,500
Total Buy Volume: 900
Ratio: 738x

Score Breakdown:
✓ Volume imbalance (3 points)
✓ Strong imbalance (2 points)
✓ Large sell block (2 points)
Total: 7 points → STRONG SELL SIGNAL
```

## Customization

### Adjust Cron Schedule

Edit `SignalCalculationService.java`:
```java
// Every 1 minute
@Scheduled(cron = "0 */1 * * * *", zone = "Asia/Ho_Chi_Minh")

// Every 10 minutes
@Scheduled(cron = "0 */10 * * * *", zone = "Asia/Ho_Chi_Minh")
```

### Adjust Time Window

Change lookback period:
```java
// Last 15 minutes
OffsetDateTime since = OffsetDateTime.now().minusMinutes(15);

// Last 1 hour
OffsetDateTime since = OffsetDateTime.now().minusHours(1);
```

### Adjust Thresholds

Modify scoring logic:
```java
// More sensitive (easier to trigger)
if (buyScore >= 3 && buyScore > sellScore) { ... }

// Less sensitive (harder to trigger)
if (buyScore >= 5 && buyScore > sellScore) { ... }
```

### Change Large Block Size

```java
// 50k as large block
.filter(t -> t.getVolume() >= 50000)

// 200k as large block
.filter(t -> t.getVolume() >= 200000)
```

### Adjust Max Signals Display

Edit `useWebSocket.ts`:
```typescript
const maxSignals = 20; // Default is 15
```

## Architecture

```
┌─────────────────────────────────────────┐
│   Spring Boot Backend                   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ SignalCalculationService        │   │
│  │ (Cron: Every 5 minutes)         │   │
│  │                                 │   │
│  │ 1. Get all stock codes          │   │
│  │ 2. Analyze last 30 min trades   │   │
│  │ 3. Calculate signal scores      │   │
│  │ 4. Broadcast to /topic/signals  │   │
│  └─────────────────────────────────┘   │
│                 ↓                       │
│  ┌─────────────────────────────────┐   │
│  │ WebSocketConfig                 │   │
│  │ Endpoint: /ws                   │   │
│  │ Topic: /topic/signals           │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
                 ↓
        WebSocket Connection
                 ↓
┌─────────────────────────────────────────┐
│   React Frontend                        │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ useWebSocket Hook               │   │
│  │ - Connect to /ws                │   │
│  │ - Subscribe to /topic/signals   │   │
│  │ - Manage signal state           │   │
│  └─────────────────────────────────┘   │
│                 ↓                       │
│  ┌─────────────────────────────────┐   │
│  │ Notifications Component         │   │
│  │ - Display signals in real-time  │   │
│  │ - Connection status             │   │
│  │ - Browser notifications         │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

## Troubleshooting

### WebSocket Not Connecting

1. **Check backend is running:**
   ```bash
   curl http://localhost:8080/actuator/health
   ```

2. **Check CORS settings** in `WebSocketConfig.java`

3. **Check browser console** for connection errors

4. **Verify port:** Frontend should be on 5173 (Vite) or 4200 (Angular)

### No Signals Appearing

1. **Check if you have trade data:**
   ```bash
   curl http://localhost:8080/api/trades
   ```

2. **Verify scheduler is enabled** in `TradeApplication.java`:
   ```java
   @EnableScheduling
   ```

3. **Check backend logs** for "Running signal calculation..." messages

4. **Lower threshold** temporarily for testing:
   ```java
   if (buyScore >= 2 && buyScore > sellScore) { ... }
   ```

### Browser Notifications Not Working

1. Check browser settings → Site settings → Notifications
2. Must be granted for `localhost:5173`
3. Click "Allow" when prompted

## Production Considerations

### CORS Configuration

Update `WebSocketConfig.java`:
```java
registry.addEndpoint("/ws")
    .setAllowedOrigins("https://your-production-domain.com")
    .withSockJS();
```

### Environment Variables

Consider using environment variables for:
- WebSocket endpoint URL
- Cron schedule
- Signal thresholds
- Time windows

### Monitoring

Add metrics for:
- Signals generated per hour
- WebSocket connection count
- Average calculation time
- Failed calculations

### Security

For production, consider:
- Authentication/Authorization for WebSocket connections
- Rate limiting
- Input validation
- Encrypted connections (WSS)

## Key Differences from Angular Implementation

| Aspect | Angular | React (This Implementation) |
|--------|---------|----------------------------|
| **Framework** | Angular 18 | React 18 + TypeScript |
| **Build Tool** | Angular CLI | Vite |
| **Styling** | CSS-in-template | Tailwind CSS |
| **Components** | Angular Components | shadcn/ui |
| **State Management** | RxJS BehaviorSubject | React useState |
| **WebSocket Hook** | Service class | Custom React Hook |
| **Routing** | RouterModule | React Router |
| **Toasts** | N/A | Sonner |

## API Endpoints

### Backend REST APIs
```
GET  /api/trades              - List trades with filters
POST /api/trades/ingest/{code} - Manually ingest trades
POST /api/trades/ingest/all   - Ingest all VN30 stocks
GET  /api/stocks              - List tracked stocks
POST /api/stocks              - Add tracked stocks
```

### WebSocket Endpoint
```
CONNECT:    ws://localhost:8080/ws
SUBSCRIBE:  /topic/signals
```

## Testing Checklist

- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] WebSocket connects successfully (check console)
- [ ] Connection status shows green indicator
- [ ] Manual ingestion triggers signal calculation
- [ ] Signals appear in notification panel
- [ ] Browser notifications work (after permission granted)
- [ ] Can clear all signals
- [ ] Signal contains correct data (volumes, price, reason)
- [ ] Multiple signals can be displayed
- [ ] Auto-reconnects after network interruption
- [ ] Works on page refresh

## Support

For issues:
1. Check backend logs for "Running signal calculation..." messages
2. Check frontend console for WebSocket connection status
3. Verify PostgreSQL is running: `docker-compose ps`
4. Ensure trade data exists in database
5. Check cron schedule alignment with current time

## Future Enhancements

Consider adding:
1. **User Preferences**: Customize thresholds per user
2. **Stock Filtering**: Only show signals for watched stocks
3. **Historical Signals**: Store signals in database
4. **Email Notifications**: Send email alerts
5. **Signal Accuracy Tracking**: Track prediction accuracy
6. **Advanced Indicators**: RSI, MACD, Moving Averages
7. **Sound Alerts**: Play different sounds for BUY/SELL
8. **Mobile Responsive**: Optimize for mobile devices
9. **Dark Mode**: Theme support
10. **Signal History Chart**: Visualize signal patterns

## License

This implementation is part of the stock-watcher project.


# Stock Watcher - Monorepo Structure

A full-stack stock trading data tracker with real-time signal notifications and user management.

## 📁 Project Structure

```
stock-watcher/
├── backend/              # Main REST API + WebSocket Service
├── cron-jobs/            # Scheduled Tasks Service
├── frontend/             # React Frontend Application
└── docker-compose.yml    # PostgreSQL database orchestration
```

## 🏗️ Architecture

```
┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│    FRONTEND       │         │     BACKEND       │         │   CRON-JOBS      │
│    (React)        │◄────────┤ (Spring Boot)     │         │ (Spring Boot)    │
│                   │  HTTP   │                   │         │                   │
│  - React App      │  REST   │  - REST APIs      │         │  - Scheduled      │
│  - Auth Context   │         │  - WebSocket      │         │    Tasks          │
│  - WebSocket      │         │  - JWT Auth       │         │  - Data Ingestion │
└──────────────────┘         └─────────┬─────────┘         └─────────┬─────────┘
                                        │                            │
                                        └────────────┬───────────────┘
                                                     │
                                        ┌────────────▼────────────┐
                                        │    POSTGRESQL DATABASE  │
                                        │    (Shared Database)    │
                                        └─────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Java 21
- Maven 3.8+
- Node.js 18+
- PostgreSQL 15+
- Docker (optional)

### 1. Start Database

```bash
docker-compose up -d postgres
```

Or manually:
```bash
# PostgreSQL should be running on localhost:5433
# Database: trade
# Username: postgre
# Password: admin
```

### 2. Start Backend Service

```bash
cd backend
mvn spring-boot:run
# Backend runs on http://localhost:8080
```

### 3. Start Cron-Jobs Service

```bash
cd cron-jobs
mvn spring-boot:run
# Cron-jobs runs on http://localhost:8898 (no REST APIs exposed)
```

### 4. Start Frontend

```bash
cd frontend
npm install
npm run dev
# Frontend runs on http://localhost:8089
```

## 📦 Services Overview

### Backend Service (`/backend`)
- **Port**: 8080
- **Purpose**: REST APIs, WebSocket server, Authentication
- **Features**:
  - RESTful APIs for trades, users, tracked stocks
  - WebSocket for real-time signal notifications
  - JWT authentication and authorization
  - Role-based access control (NORMAL, VIP, ADMIN)
- **No Scheduled Tasks**: All `@Scheduled` jobs moved to cron-jobs service

### Cron-Jobs Service (`/cron-jobs`)
- **Port**: 8898
- **Purpose**: Scheduled tasks only
- **Features**:
  - Data ingestion from external APIs (every 5 minutes)
  - Signal calculation (buy/sell signals)
  - Tracked stocks refresh and recommendations
  - Statistics calculation
  - Notification checks
- **No REST APIs**: Pure scheduled tasks service

### Frontend (`/frontend`)
- **Port**: 8089
- **Purpose**: User interface
- **Features**:
  - React + TypeScript + Vite
  - Real-time WebSocket connections
  - Authentication UI
  - Trade data visualization
  - Signal monitoring

## 🗄️ Shared Database Strategy

Both `backend` and `cron-jobs` services connect to the **same PostgreSQL database**:

- **Database**: `trade`
- **Host**: `localhost:5433` (development)
- **Tables**: `users`, `trades`, `tracked_stocks`, `app_config`
- **Schema**: Managed by JPA/Hibernate (`ddl-auto=update`)

### Benefits:
- ✅ Data consistency
- ✅ Simple deployment
- ✅ No data synchronization needed
- ✅ Shared transactions

### Trade-offs:
- ⚠️ Services are coupled to database schema
- ⚠️ Database becomes a single point of failure
- ⚠️ Both services must use compatible JPA entities

## 🔧 Development

### Building All Services

```bash
# Build backend
cd backend && mvn clean package

# Build cron-jobs
cd cron-jobs && mvn clean package

# Build frontend
cd frontend && npm run build
```

### Running Tests

```bash
# Backend tests
cd backend && mvn test

# Cron-jobs tests
cd cron-jobs && mvn test
```

## 📋 Environment Variables

### Backend (`backend/application.properties`)
- `server.port=8080`
- `spring.datasource.url=jdbc:postgresql://localhost:5433/trade`
- `spring.datasource.username=postgre`
- `spring.datasource.password=admin`

### Cron-Jobs (`cron-jobs/application.properties`)
- `server.port=8898`
- `spring.datasource.url=jdbc:postgresql://localhost:5433/trade`
- Same database connection as backend

### Frontend (`frontend/.env`)
- `VITE_API_URL=http://localhost:8080` (default)

## 🔐 Security

- **Backend**: JWT authentication, Spring Security
- **Cron-Jobs**: No security (no REST APIs exposed)
- **Frontend**: JWT tokens stored in localStorage

## 📊 Scheduled Jobs (Cron-Jobs Service)

| Job | Schedule | Description |
|-----|----------|-------------|
| VN30 Ingestion | Every 5 minutes | Fetches trade data for VN30 stocks |
| Signal Calculation | After VN30 ingestion | Calculates buy/sell signals |
| Tracked Stocks Refresh | Every 5 minutes | Refreshes tracked stocks and generates recommendations |
| Notifications Check | Every 3 minutes | Checks for BIG signals and sends notifications |
| Statistics Calculation | After VN30 ingestion | Calculates statistics for tracked stocks |

## 🐛 Troubleshooting

### Issue: Backend won't start
- Check PostgreSQL is running on port 5433
- Verify database credentials in `backend/application.properties`

### Issue: Cron-jobs won't start
- Check PostgreSQL is running
- Verify database connection
- Check logs for scheduled job errors

### Issue: Frontend can't connect to backend
- Verify backend is running on port 8080
- Check CORS configuration in `backend/src/main/java/.../config/SecurityConfig.java`
- Verify API proxy in `frontend/vite.config.ts`

### Issue: WebSocket not working
- Backend WebSocket runs on `ws://localhost:8080/ws`
- Frontend connects to backend WebSocket (not cron-jobs)
- Cron-jobs sends signals via its own message broker (may not reach clients - see note below)

### ⚠️ WebSocket Messaging Limitation

**Current Issue**: Cron-jobs service has its own in-memory message broker, so signals sent from cron-jobs may not reach clients connected to the backend WebSocket server.

**Solutions**:
1. **Recommended**: Configure shared message broker (Redis/RabbitMQ) that both services connect to
2. **Alternative**: Have cron-jobs call backend REST API to trigger signal calculation in backend
3. **Alternative**: Use HTTP/REST API from cron-jobs to backend for signal publishing

**Quick Fix**: Configure Redis as shared message broker (future enhancement)

## 📚 Documentation

- [User Management Setup](document/USER_MANAGEMENT_SETUP.md) - User authentication and roles
- Backend: See `backend/README.md`
- Cron-Jobs: See `cron-jobs/README.md`
- Frontend: See `frontend/README.md`

## 📝 License

This project is private/internal.

## 🎯 Next Steps

1. Configure shared message broker (Redis/RabbitMQ) for WebSocket messages
2. Add health checks and monitoring
3. Add Docker containers for all services
4. Implement CI/CD pipelines
5. Add integration tests


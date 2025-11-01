# Backend Service - Stock Watcher

Main REST API and WebSocket service for Stock Watcher application.

## 📋 Overview

The backend service provides:
- RESTful APIs for trades, users, authentication, and admin operations
- WebSocket server for real-time signal notifications
- JWT authentication and role-based authorization
- Business logic for trade queries, user management, and data operations

## 🚀 Quick Start

```bash
# Build
mvn clean package

# Run
mvn spring-boot:run

# Service runs on http://localhost:8080
```

## 🔌 API Endpoints

### Authentication (`/api/auth`)
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user info

### Trades (`/api/trades`) - All authenticated users
- `GET /api/trades` - Get trades with filters, pagination, sorting
- `GET /api/trades/export` - Export trades to Excel
- `POST /api/trades/import` - Import trades from Excel
- `POST /api/trades/ingest/{code}` - Ingest trades for a stock
- `POST /api/trades/ingest/all` - Ingest trades for all VN30 stocks

### Tracked Stocks (`/api/tracked-stocks`) - VIP/ADMIN only
- `GET /api/tracked-stocks` - Get user's tracked stocks
- `POST /api/tracked-stocks` - Add tracked stock
- `DELETE /api/tracked-stocks/{id}` - Delete tracked stock
- `PUT /api/tracked-stocks/{id}/toggle` - Toggle active status

### Admin (`/api/admin`) - ADMIN only
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/{id}/role` - Update user role
- `PUT /api/admin/users/{id}/status` - Enable/disable user
- `DELETE /api/admin/users/{id}` - Delete user

### WebSocket (`/ws`)
- Endpoint: `ws://localhost:8080/ws`
- Topic: `/topic/signals/user/{userId}` - User-specific signals
- Topic: `/topic/signals` - Broadcast signals (fallback)

## 🔒 Security

- **JWT Authentication**: All API endpoints require JWT token (except `/api/auth/**`)
- **Role-Based Access**: 
  - NORMAL: `/api/trades/**` only
  - VIP: `/api/trades/**`, `/api/tracked-stocks/**`, `/api/suggestions/**`
  - ADMIN: All endpoints including `/api/admin/**`

## 📦 Dependencies

- Spring Boot 3.5.6
- Spring Security (JWT authentication)
- Spring WebSocket (STOMP)
- Spring Data JPA (PostgreSQL)
- Apache POI (Excel import/export)

## ⚙️ Configuration

See `src/main/resources/application.properties`:
- Database connection
- JWT secret and expiration
- CORS origins
- WebSocket configuration

## 🔄 No Scheduled Tasks

**Important**: This service does NOT contain scheduled tasks. All `@Scheduled` jobs have been moved to the `cron-jobs` service for separation of concerns.

## 🐛 Troubleshooting

- **CORS errors**: Check `SecurityConfig.java` for allowed origins
- **Authentication fails**: Verify JWT secret in `application.properties`
- **Database connection fails**: Check PostgreSQL is running on port 5433
- **WebSocket not working**: Verify WebSocketConfig and client connection URL


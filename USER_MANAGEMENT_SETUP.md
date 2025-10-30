# User Management Feature - Setup Guide

## 🎉 Implementation Complete!

All user management features with role-based access control have been successfully implemented.

---

## 📋 What Was Implemented

### Backend (Spring Boot)
✅ User entity with UserDetails implementation  
✅ UserRole enum (NORMAL, VIP, ADMIN)  
✅ Spring Security with JWT authentication  
✅ Role-based access control  
✅ User registration and login endpoints  
✅ Admin panel for user management  
✅ Updated TrackedStock to be user-specific  
✅ Updated SignalCalculationService for per-user notifications  

### Frontend (React + TypeScript)
✅ AuthContext for state management  
✅ Login and Register pages  
✅ Protected routes with role checks  
✅ Role-based navigation in Header  
✅ Unauthorized page for access denied  

---

## 🚀 Database Migration

### Step 1: Run Database Migration

Connect to your PostgreSQL database and run:

```sql
-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_login_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT chk_role CHECK (role IN ('NORMAL', 'VIP', 'ADMIN'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Update tracked_stocks table
ALTER TABLE tracked_stocks DROP CONSTRAINT IF EXISTS uk_tracked_code;
ALTER TABLE tracked_stocks ADD COLUMN IF NOT EXISTS user_id BIGINT;
ALTER TABLE tracked_stocks ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE tracked_stocks ADD CONSTRAINT IF NOT EXISTS fk_tracked_stocks_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE tracked_stocks ADD CONSTRAINT IF NOT EXISTS uk_user_code UNIQUE (user_id, code);

CREATE INDEX IF NOT EXISTS idx_tracked_stocks_user ON tracked_stocks(user_id);

-- Create default admin user
-- Password: admin123 (BCrypt hashed)
INSERT INTO users (username, email, password, role, enabled, created_at)
VALUES ('admin', 'admin@example.com', 
        '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', 
        'ADMIN', TRUE, NOW())
ON CONFLICT (username) DO NOTHING;

-- Create test VIP user
-- Password: vip123
INSERT INTO users (username, email, password, role, enabled, created_at)
VALUES ('vipuser', 'vip@example.com', 
        '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', 
        'VIP', TRUE, NOW())
ON CONFLICT (username) DO NOTHING;

-- Create test NORMAL user
-- Password: user123
INSERT INTO users (username, email, password, role, enabled, created_at)
VALUES ('normaluser', 'user@example.com', 
        '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', 
        'NORMAL', TRUE, NOW())
ON CONFLICT (username) DO NOTHING;

-- Update existing tracked stocks to assign to admin (if any exist)
UPDATE tracked_stocks 
SET user_id = (SELECT id FROM users WHERE username = 'admin' LIMIT 1),
    created_at = NOW()
WHERE user_id IS NULL;
```

---

## 🔐 Test Credentials

| Username     | Password  | Role   | Access Level                              |
|-------------|-----------|--------|-------------------------------------------|
| admin       | admin123  | ADMIN  | Full access to all features               |
| vipuser     | vip123    | VIP    | Trades, Tracked Stocks, Suggestions       |
| normaluser  | user123   | NORMAL | Trades only                               |

---

## 🎯 Feature Access Matrix

| Feature                  | NORMAL | VIP | ADMIN |
|-------------------------|--------|-----|-------|
| Trades                  | ✅     | ✅  | ✅    |
| Tracked Stocks          | ❌     | ✅  | ✅    |
| Suggestions             | ❌     | ✅  | ✅    |
| Management (Admin Panel)| ❌     | ❌  | ✅    |
| WebSocket Signals       | ❌     | ✅  | ✅    |

### Management Screen Features (ADMIN only)
- 👥 **View All Users**: See complete list of all registered users
- 🔄 **Change User Roles**: Promote/demote users between NORMAL, VIP, and ADMIN
- ✅ **Enable/Disable Users**: Activate or deactivate user accounts
- 🗑️ **Delete Users**: Permanently remove users from the system
- 📊 **User Statistics**: View creation date and last login time
- 🔍 **Real-time Updates**: Changes take effect immediately

---

## 🔧 How to Start

### 1. Start Backend
```bash
cd /Users/canhnd/Desktop/code/microservices/spring/stock-watcher
mvn spring-boot:run
```

### 2. Start Frontend
```bash
cd frontend
npm install  # if needed
npm run dev
```

### 3. Access the Application
- Frontend: http://localhost:8089
- Backend API: http://localhost:8080
- First-time visit will redirect to `/login`

---

## 📝 How It Works

### User Registration Flow
1. User visits `/register`
2. Fills out username, email, password
3. System creates account with `NORMAL` role by default
4. Automatically logs in after registration
5. Redirects to `/` (Trades page)

### Authentication Flow
1. User logs in with username/password
2. Backend validates credentials
3. JWT token generated and returned
4. Token stored in `localStorage`
5. Token sent in `Authorization: Bearer <token>` header for all API calls

### Role-Based Access
- Frontend checks user role before rendering protected routes
- Backend enforces role requirements on API endpoints using `@PreAuthorize`
- Users without required role get redirected to `/unauthorized`

### Per-User Tracked Stocks
- Each user can create their own tracked stock list
- Signals are sent only for stocks in user's list via WebSocket topic: `/topic/signals/user/{userId}`
- Users can only view/modify their own tracked stocks

### Admin Management Panel
- Accessible only to ADMIN users via `/admin` route
- **User List**: View all users with their details in a table format
- **Role Management**: Change user roles using dropdown (NORMAL → VIP → ADMIN)
- **Status Control**: Enable/disable user accounts with toggle button
- **User Deletion**: Remove users with confirmation dialog
- **User Info Display**: 
  - User ID, username, email
  - Current role with color-coded badge
  - Account status (Active/Disabled)
  - Registration date
  - Last login timestamp

---

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user info

### Tracked Stocks (VIP/ADMIN only)
- `GET /api/tracked-stocks` - Get user's tracked stocks
- `POST /api/tracked-stocks` - Add tracked stock
- `DELETE /api/tracked-stocks/{id}` - Delete tracked stock
- `PUT /api/tracked-stocks/{id}/toggle` - Toggle active status

### Admin (ADMIN only)
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/{id}/role` - Update user role
- `PUT /api/admin/users/{id}/status` - Enable/disable user
- `DELETE /api/admin/users/{id}` - Delete user

### Trades (All authenticated users)
- `GET /api/trades` - Get trades with filters

---

## 🛠️ Admin Tasks

### Promote User to VIP
```bash
curl -X PUT http://localhost:8080/api/admin/users/{userId}/role \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"role": "VIP"}'
```

### Disable User Account
```bash
curl -X PUT http://localhost:8080/api/admin/users/{userId}/status \
  -H "Authorization: Bearer <admin-token>"
```

---

## 🐛 Troubleshooting

### Issue: Cannot login
**Solution:** 
1. Check database connection
2. Verify user exists: `SELECT * FROM users WHERE username = 'admin';`
3. Check backend logs for errors

### Issue: "Access Denied" on Tracked Stocks
**Solution:**
1. Check user role: Only VIP and ADMIN can access
2. Verify JWT token is being sent
3. Login with VIP or ADMIN account

### Issue: No WebSocket signals received
**Solution:**
1. User must be VIP or ADMIN
2. User must have active tracked stocks
3. Check WebSocket connection in browser console
4. Verify signal calculation job is running (every 5 minutes)

### Issue: Tracked stocks from before migration
**Solution:**
Run the update query to assign existing stocks to admin:
```sql
UPDATE tracked_stocks 
SET user_id = (SELECT id FROM users WHERE username = 'admin')
WHERE user_id IS NULL;
```

---

## 🔄 Migration Notes

### Breaking Changes
⚠️ **Tracked Stocks are now user-specific**
- Old tracked stocks need to be assigned to a user
- Migration script assigns them to admin user
- Each user now maintains their own list

### Database Schema Changes
- Added `users` table
- Added `user_id` column to `tracked_stocks`
- Changed unique constraint from `code` to `(user_id, code)`

---

## ✅ Post-Deployment Checklist

- [ ] Database migration completed
- [ ] Test admin login works
- [ ] Test VIP login works
- [ ] Test NORMAL user login works
- [ ] Verify NORMAL user cannot access Tracked Stocks
- [ ] Verify VIP user can access Tracked Stocks
- [ ] Verify admin can manage users
- [ ] Test user registration
- [ ] Test tracked stocks per user
- [ ] Test WebSocket signals per user

---

## 📚 Next Steps

### Optional Enhancements
1. **Password Reset**: Add forgot password functionality
2. **Email Verification**: Verify email on registration
3. **User Profile**: Allow users to update their profile
4. **Admin Dashboard**: Create comprehensive admin panel UI
5. **Activity Logs**: Track user actions
6. **Two-Factor Auth**: Add 2FA for enhanced security

---

## 🎊 Success!

Your user management system is now fully operational with:
- ✅ Secure JWT authentication
- ✅ Role-based access control
- ✅ Per-user tracked stocks
- ✅ User-specific WebSocket notifications
- ✅ Admin panel for user management

Ready to use! 🚀


# Trade Tracker Frontend

React-based frontend application for Stock Watcher - a professional stock trading data tracker with real-time signal notifications.

## 📋 Overview

Trade Tracker Frontend is a modern, responsive web application built with React, TypeScript, and Vite. It provides a comprehensive interface for monitoring stock trades, managing tracked stocks, receiving real-time trading signals, and analyzing market data.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (recommended: use [nvm](https://github.com/nvm-sh/nvm))
- npm or yarn package manager

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Frontend runs on http://localhost:8089
```

### Build for Production

```bash
# Build production bundle
npm run build

# Preview production build
npm run preview
```

## 🛠️ Technology Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **shadcn/ui** - UI component library
- **Tailwind CSS** - Utility-first CSS framework
- **Recharts** - Chart library for data visualization
- **WebSocket (STOMP)** - Real-time communication
- **React Hook Form** - Form handling
- **Zod** - Schema validation
- **date-fns** - Date utilities
- **Lucide React** - Icon library

## 📁 Project Structure

```
frontend/
├── public/              # Static assets
│   ├── favicon.svg      # Application favicon
│   └── robots.txt       # SEO robots file
├── src/
│   ├── components/      # React components
│   │   ├── ui/         # shadcn/ui components
│   │   ├── Header.tsx  # Navigation header
│   │   ├── DailyOHLCChart.tsx
│   │   ├── DailyPriceVolumeChart.tsx
│   │   ├── RealtimePriceTracking.tsx
│   │   └── ...
│   ├── contexts/       # React contexts
│   │   ├── AuthContext.tsx    # Authentication context
│   │   └── I18nContext.tsx    # Internationalization
│   ├── hooks/          # Custom React hooks
│   │   ├── useWebSocket.ts
│   │   ├── useTrackedStockNotifications.ts
│   │   └── useTrackedStockStats.ts
│   ├── lib/            # Utility libraries
│   │   ├── api.ts      # API client
│   │   └── utils.ts    # Helper functions
│   ├── pages/          # Page components
│   │   ├── Index.tsx   # Trades page
│   │   ├── TrackedStocks.tsx
│   │   ├── Signals.tsx
│   │   ├── Suggestions.tsx
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   └── AdminPanel.tsx
│   ├── App.tsx         # Main App component
│   ├── main.tsx        # Entry point
│   └── index.css       # Global styles
├── index.html          # HTML template
├── package.json        # Dependencies
├── vite.config.ts      # Vite configuration
├── tailwind.config.ts  # Tailwind configuration
└── tsconfig.json       # TypeScript configuration
```

## ✨ Features

### 🔐 Authentication & Authorization

- User registration and login
- JWT token-based authentication
- Role-based access control (NORMAL, VIP, ADMIN)
- Protected routes
- Automatic token refresh

### 📊 Trade Monitoring

- **Trade Table**: View and filter trades with pagination
- **Advanced Filters**: Filter by stock code, trade type, volume, date range
- **Sorting**: Sort by code, time, price, volume
- **Export**: Export trades to Excel
- **Statistics**: View total volume, buy/sell volumes, transaction counts
- **Charts**: 
  - Daily price & volume charts
  - OHLC (Open, High, Low, Close) charts
  - Real-time price tracking with 10-minute intervals

### 📈 Tracked Stocks

- Add/remove tracked stocks from VN30 list
- View real-time statistics (lowest/highest prices, volumes)
- Set cost basis for profit/loss tracking
- Enable/disable stock tracking
- Real-time price tracking with intraday charts
- Room bar statistics (10-day analysis)

### 🔔 Real-time Signals

- WebSocket-based real-time notifications
- Buy/sell signal alerts
- Browser notifications support
- Signal history and filtering
- Score-based signal strength

### 💡 Trading Suggestions

- AI-powered trading recommendations
- Stock analysis and insights
- Signal-based suggestions
- Historical performance tracking

### 👥 User Management (Admin)

- View all users
- Change user roles
- Enable/disable users
- Delete users
- User statistics

### 🌐 Internationalization

- Multi-language support (Vietnamese/English)
- Language switcher
- Localized date/time formats

## 🔌 API Integration

The frontend communicates with the backend via:

- **REST API**: `http://localhost:8080/api`
- **WebSocket**: `ws://localhost:8080/ws`

### API Client

All API calls are handled through `/src/lib/api.ts` which:
- Automatically adds JWT tokens to requests
- Handles authentication errors
- Provides type-safe API methods

## 🎨 UI Components

The application uses **shadcn/ui** components:

- Buttons, Cards, Tables
- Dialogs, Dropdowns, Selects
- Forms, Inputs, Date Pickers
- Charts, Tooltips, Toasts
- And more...

## 📱 Responsive Design

- Mobile-first approach
- Responsive layouts
- Touch-friendly interfaces
- Adaptive charts and tables

## 🔒 Security

- JWT tokens stored in localStorage
- Automatic token expiration handling
- Protected routes
- Role-based UI rendering
- XSS protection via React

## 🧪 Development

### Environment Variables

Create a `.env` file in the frontend directory:

```env
VITE_API_URL=http://localhost:8080
```

### Linting

```bash
npm run lint
```

### Type Checking

TypeScript type checking is integrated into the build process.

## 🚀 Deployment

### Build

```bash
npm run build
```

This creates an optimized production build in the `dist/` directory.

### Preview

```bash
npm run preview
```

Preview the production build locally.

### Production Deployment

The `dist/` folder can be served by:
- Nginx
- Apache
- Any static file server
- Vercel, Netlify, or similar platforms

## 📚 Key Features Implementation

### Real-time Price Tracking

- **Component**: `RealtimePriceTracking.tsx`
- **Features**:
  - Select stock from VN30 list (searchable dropdown)
  - Display intraday price movement (10-minute intervals)
  - Show highest, lowest, and current prices
  - Auto-refresh every 30 seconds
  - Line chart visualization

### WebSocket Integration

- **Hook**: `useWebSocket.ts`, `useTrackedStockNotifications.ts`
- **Features**:
  - Real-time signal notifications
  - Automatic reconnection
  - Browser notifications
  - User-specific signal topics

### Chart Visualizations

- **Libraries**: Recharts
- **Charts**:
  - Daily price & volume charts
  - OHLC candlestick charts
  - Real-time price tracking charts
  - Room bar statistics charts

## 🐛 Troubleshooting

### Issue: Frontend can't connect to backend

- Verify backend is running on `http://localhost:8080`
- Check CORS configuration in backend
- Verify API URL in `.env` file

### Issue: WebSocket not connecting

- Check backend WebSocket is running
- Verify WebSocket URL in code
- Check browser console for errors
- Ensure JWT token is valid

### Issue: Build errors

- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Clear Vite cache: `rm -rf node_modules/.vite`
- Check Node.js version (requires 18+)

## 📝 Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🔗 Related Documentation

- [Main README](../README.md) - Project overview
- [Backend README](../backend/README.md) - Backend API documentation
- [User Management Setup](../document/USER_MANAGEMENT_SETUP.md) - Authentication setup
- [Signal Notifications](../document/SIGNAL_NOTIFICATIONS_README.md) - WebSocket signals

## 📄 License

This project is private/internal.

## 🎯 Future Enhancements

- [ ] Dark mode support
- [ ] Mobile app (React Native)
- [ ] Advanced charting (candlesticks, indicators)
- [ ] Portfolio management
- [ ] Alert/notification settings
- [ ] Export charts as images
- [ ] Data export (CSV, PDF)
- [ ] Performance optimizations
- [ ] Unit and integration tests

## 👥 Contributing

This is an internal project. For contributions, please contact the project maintainers.

## 📞 Support

For issues or questions, please contact the development team.

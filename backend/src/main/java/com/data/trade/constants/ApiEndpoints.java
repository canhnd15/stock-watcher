package com.data.trade.constants;

/**
 * Constants for API endpoints
 * Centralized endpoint paths for easier maintenance and refactoring
 */
public class ApiEndpoints {

    // Base paths
    public static final String API_BASE = "/api";
    public static final String API_AUTH = "/api/auth";
    public static final String API_ADMIN = "/api/admin";
    public static final String API_TRADES = "/api/trades";
    public static final String API_TRACKED_STOCKS = "/api/tracked-stocks";
    public static final String API_STOCKS = "/api/stocks";
    public static final String API_SUGGESTIONS = "/api/suggestions";
    public static final String API_SIGNALS = "/api/signals";
    public static final String API_CONFIG = "/api/config";
    public static final String API_INTERNAL = "/api/internal";

    // Auth endpoints (full paths)
    public static final String AUTH_REGISTER = "/api/auth/register";
    public static final String AUTH_LOGIN = "/api/auth/login";
    public static final String AUTH_ME = "/api/auth/me";
    
    // Auth endpoint paths (relative to base /api/auth)
    public static final String AUTH_REGISTER_PATH = "/register";
    public static final String AUTH_LOGIN_PATH = "/login";
    public static final String AUTH_ME_PATH = "/me";
    
    // Admin endpoint paths (relative to base /api/admin)
    public static final String ADMIN_USERS_PATH = "/users";
    public static final String ADMIN_USERS_BY_ID_PATH = "/users/{userId}";
    public static final String ADMIN_USERS_ROLE_PATH = "/users/{userId}/role";
    public static final String ADMIN_USERS_STATUS_PATH = "/users/{userId}/status";
    
    // Note: ADMIN_USERS_BY_ID_PATH is used for both GET and DELETE operations
    
    // Trades endpoint paths (relative to base /api/trades)
    public static final String TRADES_INGEST_CODE_PATH = "/ingest/{code}";
    public static final String TRADES_INGEST_ALL_PATH = "/ingest/all";
    public static final String TRADES_RECOMMENDATION_PATH = "/recommendation";
    public static final String TRADES_REINGEST_CODE_PATH = "/reingest/{code}";
    public static final String TRADES_EXPORT_PATH = "/export";
    public static final String TRADES_IMPORT_PATH = "/import";
    public static final String TRADES_DAILY_STATS_PATH = "/daily-stats";
    public static final String TRADES_DAILY_OHLC_PATH = "/daily-ohlc";
    
    // Tracked Stocks endpoint paths (relative to base /api/tracked-stocks)
    public static final String TRACKED_STOCKS_STATS_PATH = "/stats";
    public static final String TRACKED_STOCKS_BY_ID_PATH = "/{id}";
    public static final String TRACKED_STOCKS_TOGGLE_PATH = "/{id}/toggle";
    
    // Stocks endpoint paths (relative to base /api/stocks)
    public static final String STOCKS_ROOMBARS_CODE_PATH = "/roombars/{code}";
    public static final String STOCKS_INTRADAY_PRICE_CODE_PATH = "/intraday-price/{code}";
    public static final String STOCKS_INTRADAY_PRICE_BATCH_PATH = "/intraday-price/batch";

    // Suggestions endpoint paths (relative to base /api/suggestions)
    public static final String SUGGESTIONS_BY_CODE_PATH = "/{code}";
    public static final String SUGGESTIONS_TOP_PATH = "/top";

    // Signals endpoint paths (relative to base /api/signals)
    public static final String SIGNALS_REFRESH_PATH = "/refresh";
    public static final String SIGNALS_CHECK_TRACKED_PATH = "/check-tracked";
    
    // Config endpoint paths (relative to base /api/config)
    public static final String CONFIG_VN30_CRON_PATH = "/vn30-cron";
    public static final String CONFIG_TRACKED_STOCKS_CRON_PATH = "/tracked-stocks-cron";
    public static final String CONFIG_SIGNAL_CALCULATION_CRON_PATH = "/signal-calculation-cron";
    
    // Internal endpoint paths (relative to base /api/internal)
    public static final String INTERNAL_SIGNALS_REFRESH_PATH = "/signals/refresh";
    public static final String INTERNAL_SIGNALS_CHECK_TRACKED_PATH = "/signals/check-tracked";

    // Security patterns (for use in SecurityConfig)
    public static final String API_AUTH_PATTERN = "/api/auth/**";
    public static final String API_INTERNAL_PATTERN = "/api/internal/**";
    public static final String API_TRADES_PATTERN = "/api/trades/**";
    public static final String API_TRACKED_STOCKS_PATTERN = "/api/tracked-stocks/**";
    public static final String API_SUGGESTIONS_PATTERN = "/api/suggestions/**";
    public static final String API_SIGNALS_PATTERN = "/api/signals/**";
    public static final String API_ADMIN_PATTERN = "/api/admin/**";
    public static final String API_CONFIG_PATTERN = "/api/config/**";
    public static final String WS_PATTERN = "/ws/**";
    public static final String ACTUATOR_HEALTH = "/actuator/health";

    private ApiEndpoints() {
    }
}


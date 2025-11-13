import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'vi' | 'en';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

// Translation files
const translations = {
  vi: {
    // Common
    'common.search': 'Tìm kiếm',
    'common.loading': 'Đang tải...',
    'common.error': 'Lỗi',
    'common.success': 'Thành công',
    'common.save': 'Lưu',
    'common.cancel': 'Hủy',
    'common.delete': 'Xóa',
    'common.edit': 'Sửa',
    'common.add': 'Thêm',
    'common.close': 'Đóng',
    'common.confirm': 'Xác nhận',
    'common.yes': 'Có',
    'common.no': 'Không',
    'common.all': 'Tất cả',
    'common.active': 'Hoạt động',
    'common.inactive': 'Không hoạt động',
    'common.page': 'Trang',
    'common.of': 'của',
    'common.results': 'kết quả',
    'common.noResults': 'Không có kết quả',
    
    // Navigation
    'nav.trades': 'Giao dịch',
    'nav.trackedStocks': 'Cổ phiếu theo dõi',
    'nav.shortTermPortfolio': 'Portfolio ngắn hạn',
    'nav.suggestions': 'Gợi ý',
    'nav.signals': 'Tín hiệu',
    'nav.userManagement': 'Quản lý người dùng',
    'nav.systemConfig': 'Cấu hình hệ thống',
    
    // Auth
    'auth.login': 'Đăng nhập',
    'auth.logout': 'Đăng xuất',
    'auth.register': 'Đăng ký',
    'auth.username': 'Tên đăng nhập',
    'auth.password': 'Mật khẩu',
    'auth.email': 'Email',
    'auth.confirmPassword': 'Xác nhận mật khẩu',
    'auth.loginSuccess': 'Đăng nhập thành công!',
    'auth.loginFailed': 'Đăng nhập thất bại',
    'auth.registerSuccess': 'Đăng ký thành công!',
    'auth.registerFailed': 'Đăng ký thất bại',
    'auth.invalidCredentials': 'Tên đăng nhập hoặc mật khẩu không đúng',
    'auth.createAccount': 'Tạo tài khoản',
    'auth.alreadyHaveAccount': 'Đã có tài khoản?',
    'auth.dontHaveAccount': 'Chưa có tài khoản?',
    'auth.signInToAccess': 'Đăng nhập để truy cập bảng điều khiển',
    'auth.enterUsername': 'Nhập tên đăng nhập',
    'auth.enterPassword': 'Nhập mật khẩu',
    'auth.loggingIn': 'Đang đăng nhập...',
    'auth.joinTradeTracker': 'Tham gia Trade Tracker để bắt đầu theo dõi cổ phiếu',
    'auth.chooseUsername': 'Chọn tên đăng nhập',
    'auth.passwordMinLength': 'Tạo mật khẩu (tối thiểu 6 ký tự)',
    'auth.confirmPasswordPlaceholder': 'Xác nhận mật khẩu',
    'auth.passwordMismatch': 'Mật khẩu không khớp',
    'auth.passwordTooShort': 'Mật khẩu phải có ít nhất 6 ký tự',
    'auth.creatingAccount': 'Đang tạo tài khoản...',
    'auth.registerHere': 'Đăng ký tại đây',
    'auth.loginHere': 'Đăng nhập tại đây',
    'auth.welcomeMessage': 'Đăng ký thành công! Chào mừng đến với Trade Tracker.',
    
    // Trades
    'trades.title': 'Giao dịch',
    'trades.code': 'Mã',
    'trades.time': 'Thời gian',
    'trades.date': 'Ngày',
    'trades.side': 'Loại',
    'trades.price': 'Giá',
    'trades.volume': 'Khối lượng',
    'trades.type': 'Loại',
    'trades.buy': 'Mua',
    'trades.sell': 'Bán',
    'trades.fromDate': 'Từ ngày',
    'trades.toDate': 'Đến ngày',
    'trades.volumeRange': 'Khoảng khối lượng',
    'trades.totalVolume': 'Tổng khối lượng',
    'trades.buyVolume': 'Khối lượng mua',
    'trades.sellVolume': 'Khối lượng bán',
    'trades.buyCount': 'Số lần mua',
    'trades.sellCount': 'Số lần bán',
    'trades.export': 'Xuất Excel',
    'trades.import': 'Nhập Excel',
    'trades.selectStock': 'Chọn mã cổ phiếu...',
    'trades.searchStock': 'Tìm kiếm mã cổ phiếu...',
    'trades.noStockFound': 'Không tìm thấy mã cổ phiếu.',
    'trades.search': 'Tìm kiếm',
    'trades.allMatchingTrades': 'Tất cả giao dịch khớp',
    'trades.transactions': 'giao dịch',
    'trades.ingestCode': 'Mã nhập dữ liệu',
    'trades.selectIngestCode': 'Chọn mã nhập dữ liệu...',
    'trades.searchIngestCode': 'Tìm kiếm mã...',
    'trades.ingestAll': 'Nhập tất cả',
    'trades.ingesting': 'Đang nhập...',
    'trades.ingestSuccess': 'Nhập dữ liệu thành công',
    'trades.ingestFailed': 'Nhập dữ liệu thất bại',
    'trades.selectPageSize': 'Chọn kích thước trang',
    'trades.noResults': 'Không có kết quả',
    
    // Tracked Stocks
    'tracked.title': 'Cổ phiếu theo dõi',
    'tracked.addStock': 'Thêm cổ phiếu',
    'tracked.customCodes': 'Mã tùy chỉnh',
    'tracked.selectFromVN30': 'Chọn từ VN30',
    'tracked.stockCode': 'Mã cổ phiếu',
    'tracked.status': 'Trạng thái',
    'tracked.active': 'Hoạt động',
    'tracked.inactive': 'Tạm dừng',
    'tracked.addSuccess': 'Đã thêm {count} mã cổ phiếu',
    'tracked.deleteSuccess': 'Đã xóa {code}',
    'tracked.deleteConfirm': 'Bạn có chắc muốn xóa {code}?',
    
    // Signals
    'signals.title': 'Tín hiệu',
    'signals.realTimeSignals': 'Tín hiệu thời gian thực',
    'signals.buy': 'Mua',
    'signals.sell': 'Bán',
    'signals.score': 'Điểm',
    'signals.time': 'Thời gian',
    'signals.reason': 'Lý do',
    'signals.priceChange': 'Thay đổi giá',
    'signals.listening': 'Đang lắng nghe tín hiệu...',
    'signals.connecting': 'Đang kết nối...',
    'signals.clear': 'Xóa tất cả ({count})',
    'signals.refresh': 'Làm mới',
    'signals.active': 'Hoạt động',
    'signals.disconnected': 'Mất kết nối',
    'signals.liveSignalsDescription': 'Tín hiệu mua/bán trực tiếp dựa trên phân tích giao dịch',
    'signals.buyVolume': 'Khối lượng mua',
    'signals.sellVolume': 'Khối lượng bán',
    'signals.price': 'Giá',
    'signals.change': 'Thay đổi',
    'signals.signalsDetected': 'Tín hiệu xuất hiện khi phát hiện áp lực mua/bán mạnh',
    'signals.multiFactorAnalysis': '✓ Phân tích đa yếu tố (khối lượng, khối lớn, động lượng)',
    'signals.analyzingLast30Minutes': '✓ Phân tích 30 phút giao dịch gần nhất',
    'signals.minimumScoreThreshold': '✓ Ngưỡng điểm tối thiểu: 4 điểm',
    
    // Admin
    'admin.title': 'Quản lý người dùng',
    'admin.allUsers': 'Tất cả người dùng',
    'admin.userId': 'ID',
    'admin.username': 'Tên đăng nhập',
    'admin.email': 'Email',
    'admin.role': 'Vai trò',
    'admin.status': 'Trạng thái',
    'admin.created': 'Ngày tạo',
    'admin.lastLogin': 'Lần đăng nhập cuối',
    'admin.enable': 'Kích hoạt',
    'admin.disable': 'Vô hiệu hóa',
    'admin.deleteUser': 'Xóa người dùng',
    'admin.deleteConfirm': 'Bạn có chắc muốn xóa người dùng này?',
    'admin.deleteSuccess': 'Đã xóa người dùng',
    'admin.roleUpdated': 'Đã cập nhật vai trò',
    'admin.statusUpdated': 'Đã cập nhật trạng thái',
    
    // Roles
    'role.NORMAL': 'Thường',
    'role.VIP': 'VIP',
    'role.ADMIN': 'Quản trị',
    
    // Errors
    'error.loadFailed': 'Tải dữ liệu thất bại',
    'error.saveFailed': 'Lưu thất bại',
    'error.deleteFailed': 'Xóa thất bại',
    'error.operationFailed': 'Thao tác thất bại',
    'error.unauthorized': 'Không có quyền truy cập',
    'error.notFound': 'Không tìm thấy',
    
    // Pagination
    'pagination.pageSize': 'Kích thước trang',
    'pagination.currentPage': 'Trang hiện tại',
    'pagination.totalPages': 'Tổng số trang',
    'pagination.totalRecords': 'Tổng số bản ghi',
    'pagination.prev': 'Trước',
    'pagination.next': 'Tiếp',
    
    // Unauthorized
    'unauthorized.title': 'Truy cập bị từ chối',
    'unauthorized.message': 'Bạn không có quyền truy cập trang này',
    'unauthorized.contact': 'Vui lòng liên hệ quản trị viên để nâng cấp tài khoản',
    'unauthorized.goHome': 'Về trang chủ',
  },
  en: {
    // Common
    'common.search': 'Search',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.add': 'Add',
    'common.close': 'Close',
    'common.confirm': 'Confirm',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.all': 'All',
    'common.active': 'Active',
    'common.inactive': 'Inactive',
    'common.page': 'Page',
    'common.of': 'of',
    'common.results': 'results',
    'common.noResults': 'No results',
    
    // Navigation
    'nav.trades': 'Trades',
    'nav.trackedStocks': 'Tracked Stocks',
    'nav.shortTermPortfolio': 'Short-Term Portfolio',
    'nav.suggestions': 'Suggestions',
    'nav.signals': 'Signals',
    'nav.userManagement': 'User Management',
    'nav.systemConfig': 'System Config',
    
    // Auth
    'auth.login': 'Login',
    'auth.logout': 'Logout',
    'auth.register': 'Register',
    'auth.username': 'Username',
    'auth.password': 'Password',
    'auth.email': 'Email',
    'auth.confirmPassword': 'Confirm Password',
    'auth.loginSuccess': 'Login successful!',
    'auth.loginFailed': 'Login failed',
    'auth.registerSuccess': 'Registration successful!',
    'auth.registerFailed': 'Registration failed',
    'auth.invalidCredentials': 'Invalid username or password',
    'auth.createAccount': 'Create Account',
    'auth.alreadyHaveAccount': 'Already have an account?',
    'auth.dontHaveAccount': "Don't have an account?",
    'auth.signInToAccess': 'Sign in to access your dashboard',
    'auth.enterUsername': 'Enter your username',
    'auth.enterPassword': 'Enter your password',
    'auth.loggingIn': 'Logging in...',
    'auth.joinTradeTracker': 'Join Trade Tracker to start monitoring stocks',
    'auth.chooseUsername': 'Choose a username',
    'auth.passwordMinLength': 'Create a password (min 6 characters)',
    'auth.confirmPasswordPlaceholder': 'Confirm your password',
    'auth.passwordMismatch': 'Passwords do not match',
    'auth.passwordTooShort': 'Password must be at least 6 characters',
    'auth.creatingAccount': 'Creating account...',
    'auth.registerHere': 'Register here',
    'auth.loginHere': 'Login here',
    'auth.welcomeMessage': 'Registration successful! Welcome to Trade Tracker.',
    
    // Trades
    'trades.title': 'Trades',
    'trades.code': 'Code',
    'trades.time': 'Time',
    'trades.date': 'Date',
    'trades.side': 'Side',
    'trades.price': 'Price',
    'trades.volume': 'Volume',
    'trades.type': 'Type',
    'trades.buy': 'Buy',
    'trades.sell': 'Sell',
    'trades.fromDate': 'From Date',
    'trades.toDate': 'To Date',
    'trades.volumeRange': 'Volume Range',
    'trades.totalVolume': 'Total Volume',
    'trades.buyVolume': 'Buy Volume',
    'trades.sellVolume': 'Sell Volume',
    'trades.buyCount': 'Buy Count',
    'trades.sellCount': 'Sell Count',
    'trades.export': 'Export Excel',
    'trades.import': 'Import Excel',
    'trades.selectStock': 'Select stock...',
    'trades.searchStock': 'Search stock...',
    'trades.noStockFound': 'No stock found.',
    'trades.search': 'Search',
    'trades.allMatchingTrades': 'All matching trades',
    'trades.transactions': 'transactions',
    'trades.ingestCode': 'Ingest Code',
    'trades.selectIngestCode': 'Select ingest code...',
    'trades.searchIngestCode': 'Search code...',
    'trades.ingestAll': 'Ingest All',
    'trades.ingesting': 'Ingesting...',
    'trades.ingestSuccess': 'Data ingested successfully',
    'trades.ingestFailed': 'Data ingestion failed',
    'trades.selectPageSize': 'Select page size',
    'trades.noResults': 'No results',
    
    // Tracked Stocks
    'tracked.title': 'Tracked Stocks',
    'tracked.addStock': 'Add Stock',
    'tracked.customCodes': 'Custom Codes',
    'tracked.selectFromVN30': 'Select from VN30',
    'tracked.stockCode': 'Stock Code',
    'tracked.status': 'Status',
    'tracked.active': 'Active',
    'tracked.inactive': 'Inactive',
    'tracked.addSuccess': 'Added {count} stock code(s)',
    'tracked.deleteSuccess': 'Deleted {code}',
    'tracked.deleteConfirm': 'Are you sure you want to delete {code}?',
    
    // Signals
    'signals.title': 'Signals',
    'signals.realTimeSignals': 'Real-time Signals',
    'signals.buy': 'BUY',
    'signals.sell': 'SELL',
    'signals.score': 'Score',
    'signals.time': 'Time',
    'signals.reason': 'Reason',
    'signals.priceChange': 'Price Change',
    'signals.listening': 'Listening for signals...',
    'signals.connecting': 'Connecting...',
    'signals.clear': 'Clear All ({count})',
    'signals.refresh': 'Refresh',
    'signals.active': 'Active',
    'signals.disconnected': 'Disconnected',
    'signals.liveSignalsDescription': 'Live buy/sell signals based on trade analysis',
    'signals.buyVolume': 'Buy Volume',
    'signals.sellVolume': 'Sell Volume',
    'signals.price': 'Price',
    'signals.change': 'Change',
    'signals.signalsDetected': 'Signals appear when strong buy/sell pressure is detected',
    'signals.multiFactorAnalysis': '✓ Multi-factor analysis (volume, blocks, momentum)',
    'signals.analyzingLast30Minutes': '✓ Analyzing last 30 minutes of trades',
    'signals.minimumScoreThreshold': '✓ Minimum score threshold: 4 points',
    
    // Admin
    'admin.title': 'User Management',
    'admin.allUsers': 'All Users',
    'admin.userId': 'ID',
    'admin.username': 'Username',
    'admin.email': 'Email',
    'admin.role': 'Role',
    'admin.status': 'Status',
    'admin.created': 'Created',
    'admin.lastLogin': 'Last Login',
    'admin.enable': 'Enable',
    'admin.disable': 'Disable',
    'admin.deleteUser': 'Delete User',
    'admin.deleteConfirm': 'Are you sure you want to delete this user?',
    'admin.deleteSuccess': 'User deleted successfully',
    'admin.roleUpdated': 'User role updated',
    'admin.statusUpdated': 'User status updated',
    
    // Roles
    'role.NORMAL': 'Normal',
    'role.VIP': 'VIP',
    'role.ADMIN': 'Admin',
    
    // Errors
    'error.loadFailed': 'Failed to load data',
    'error.saveFailed': 'Failed to save',
    'error.deleteFailed': 'Failed to delete',
    'error.operationFailed': 'Operation failed',
    'error.unauthorized': 'Access denied',
    'error.notFound': 'Not found',
    
    // Pagination
    'pagination.pageSize': 'Page size',
    'pagination.currentPage': 'Current page',
    'pagination.totalPages': 'Total pages',
    'pagination.totalRecords': 'Total records',
    'pagination.prev': 'Prev',
    'pagination.next': 'Next',
    
    // Unauthorized
    'unauthorized.title': 'Access Denied',
    'unauthorized.message': 'You don\'t have permission to access this page',
    'unauthorized.contact': 'Please contact your administrator to upgrade your account',
    'unauthorized.goHome': 'Go to Dashboard',
  },
};

// Simple translation function with placeholder support
const translate = (key: string, lang: Language): string => {
  // Directly access the flat key in translations
  const langTranslations = translations[lang];
  let value = langTranslations?.[key];
  
  // If not found, try English as fallback
  if (value === undefined && lang === 'vi') {
    value = translations.en?.[key];
  }
  
  // If still not found, return the key itself
  return value || key;
};

interface I18nProviderProps {
  children: ReactNode;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language') as Language;
    return saved || 'vi'; // Default to Vietnamese
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    let translated = translate(key, language);
    
    // Replace placeholders like {count}, {code}, etc.
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        translated = translated.replace(`{${paramKey}}`, String(paramValue));
      });
    }
    
    return translated;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
};


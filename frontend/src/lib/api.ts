/**
 * API utility to handle authenticated requests
 * Automatically adds JWT token to all API calls
 */

const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

export const api = {
  get: async (url: string, options?: RequestInit) => {
    return fetch(url, {
      ...options,
      method: 'GET',
      headers: {
        ...getAuthHeaders(),
        ...options?.headers,
      },
    });
  },

  post: async (url: string, body?: any, options?: RequestInit) => {
    return fetch(url, {
      ...options,
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  put: async (url: string, body?: any, options?: RequestInit) => {
    return fetch(url, {
      ...options,
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  delete: async (url: string, options?: RequestInit) => {
    return fetch(url, {
      ...options,
      method: 'DELETE',
      headers: {
        ...getAuthHeaders(),
        ...options?.headers,
      },
    });
  },
};

// Room Bar Statistics Types
export interface Roombar {
  code: string;
  buyVal: number;
  sellVal: number;
  netVal: number;
  buyVol: number;
  sellVol: number;
  netVol: number;
  timeframe: string;
  time: string;
}

export interface RoombarResponse {
  data: {
    bars: Roombar[];
  };
}

// Get room bars statistics for a stock
export const getStockRoombars = async (code: string, type: string = "10day"): Promise<RoombarResponse> => {
  const response = await api.get(`/api/stocks/roombars/${code}?type=${type}`);
  if (!response.ok) throw new Error("Failed to fetch roombars");
  return response.json();
};

// Intraday Price Types
export interface IntradayPrice {
  time: string; // Format: "HH:mm" (e.g., "09:30", "09:40")
  averagePrice: number;
  highestPrice: number;
  lowestPrice: number;
  totalVolume: number;
}

export interface IntradayPriceStats {
  highestPrice: number;
  lowestPrice: number;
  currentPrice: number;
}

// Get intraday price data for a stock
export const getIntradayPrice = async (code: string, date?: string): Promise<IntradayPrice[]> => {
  const url = date 
    ? `/api/stocks/intraday-price/${code}?date=${date}`
    : `/api/stocks/intraday-price/${code}`;
  const response = await api.get(url);
  if (!response.ok) throw new Error("Failed to fetch intraday price data");
  const data = await response.json();
  // Convert BigDecimal to number
  return data.map((item: any) => ({
    time: item.time,
    averagePrice: item.averagePrice ? parseFloat(item.averagePrice) : 0,
    highestPrice: item.highestPrice ? parseFloat(item.highestPrice) : 0,
    lowestPrice: item.lowestPrice ? parseFloat(item.lowestPrice) : 0,
    totalVolume: item.totalVolume || 0,
  }));
};


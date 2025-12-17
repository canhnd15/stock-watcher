/**
 * API utility to handle authenticated requests
 * Automatically adds Keycloak token to all API calls
 */

// Token getter function - will be set by AuthContext
let tokenGetter: (() => string | null) | null = null;

export const setTokenGetter = (getter: () => string | null) => {
  tokenGetter = getter;
};

const getAuthHeaders = async (): Promise<HeadersInit> => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (tokenGetter) {
    const token = tokenGetter();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  
  return headers;
};

export const api = {
  get: async (url: string, options?: RequestInit) => {
    const headers = await getAuthHeaders();
    return fetch(url, {
      ...options,
      method: 'GET',
      headers: {
        ...headers,
        ...options?.headers,
      },
    });
  },

  post: async (url: string, body?: any, options?: RequestInit) => {
    const headers = await getAuthHeaders();
    return fetch(url, {
      ...options,
      method: 'POST',
      headers: {
        ...headers,
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  put: async (url: string, body?: any, options?: RequestInit) => {
    const headers = await getAuthHeaders();
    return fetch(url, {
      ...options,
      method: 'PUT',
      headers: {
        ...headers,
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  delete: async (url: string, options?: RequestInit) => {
    const headers = await getAuthHeaders();
    return fetch(url, {
      ...options,
      method: 'DELETE',
      headers: {
        ...headers,
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

// Get intraday price data for multiple stocks in batch
export const getBatchIntradayPrice = async (
  codes: string[], 
  date?: string
): Promise<Record<string, IntradayPrice[]>> => {
  const requestBody: { codes: string[]; date?: string } = { codes };
  if (date) {
    requestBody.date = date;
  }
  
  const response = await api.post("/api/stocks/intraday-price/batch", requestBody);
  if (!response.ok) throw new Error("Failed to fetch batch intraday price data");
  
  const data: { data: Record<string, any[]> } = await response.json();
  
  // Convert BigDecimal to number for each stock's data
  const result: Record<string, IntradayPrice[]> = {};
  Object.entries(data.data).forEach(([code, items]) => {
    result[code] = items.map((item: any) => ({
      time: item.time,
      averagePrice: item.averagePrice ? parseFloat(item.averagePrice) : 0,
      highestPrice: item.highestPrice ? parseFloat(item.highestPrice) : 0,
      lowestPrice: item.lowestPrice ? parseFloat(item.lowestPrice) : 0,
      totalVolume: item.totalVolume || 0,
    }));
  });
  
  return result;
};


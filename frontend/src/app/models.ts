export interface Trade {
  id?: number;
  code: string;
  price: number;
  volume: number;
  side: string;
  tradeTime: string; // ISO string
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number; // current page index
  size: number;   // page size
}

export interface TrackedStock {
  id?: number;
  code: string;
  active: boolean;
}

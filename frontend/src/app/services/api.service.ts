import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Page, Trade, TrackedStock } from '../models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  getTrades(params: {
    code?: string;
    type?: string;
    minVolume?: number;
    maxVolume?: number;
    minPrice?: number;
    maxPrice?: number;
    highVolume?: number;
    page?: number;
    size?: number;
  }): Observable<Page<Trade>> {
    let p = new HttpParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        p = p.set(k, String(v));
      }
    });
    return this.http.get<Page<Trade>>('/api/trades', { params: p });
  }

  ingestNow(code: string): Observable<any> {
    return this.http.post(`/api/trades/ingest/${encodeURIComponent(code)}`, {});
  }

  listStocks(): Observable<TrackedStock[]> {
    return this.http.get<TrackedStock[]>('/api/stocks');
  }

  upsertStocks(codes: string[]): Observable<any> {
    return this.http.post('/api/stocks', { codes });
  }

  setActive(code: string, active: boolean): Observable<TrackedStock> {
    return this.http.put<TrackedStock>(`/api/stocks/${encodeURIComponent(code)}/active/${active}`, {});
  }
}

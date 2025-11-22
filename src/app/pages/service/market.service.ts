// src/app/services/market.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MarketService {

  private apiUrl = 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';
  private apiKey = '579b464db66ec23bdd000001f27574d1b76643b970d5fefe285fca51';

  constructor(private http: HttpClient) { }

  getMarketRates(options?: {
    state?: string;
    commodity?: string;
    market?: string;
    limit?: number;
    offset?: number;
    date?: string;
  }): Observable<any> {
    let params = new HttpParams()
      .set('api-key', this.apiKey)
      .set('format', 'json')
      .set('limit', String(8000))
      .set('offset', String(options?.offset ?? 0));

    if (options?.state) params = params.set('filters[state]', options.state);
    if (options?.commodity) params = params.set('filters[commodity]', options.commodity);
    if (options?.market) params = params.set('filters[market]', options.market);
    if (options?.date) params = params.set('filters[arrival_date]', options.date);

    return this.http.get<any>(this.apiUrl, { params });
  }

  // convenience endpoint to fetch time-series (multiple days) by market+commodity
  getMarketTimeSeries(market: string, commodity: string, limit = 30): Observable<any> {
    const params = new HttpParams()
      .set('api-key', this.apiKey)
      .set('format', 'json')
      .set('filters[market]', market)
      .set('filters[commodity]', commodity)
      .set('limit', String(limit))
      .set('sort', '-arrival_date'); // recent first
    return this.http.get<any>(this.apiUrl, { params });
  }
}

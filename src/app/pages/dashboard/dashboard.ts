// import { Component } from '@angular/core';


// @Component({
//     selector: 'app-dashboard',
//     imports: [],
//     template: `
//         <div class="grid grid-cols-12 gap-8">

//         </div>
//     `
// })
// export class Dashboard {



// }

// src/app/market/market.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, Subscription, interval, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';

import { ChartConfiguration, ChartOptions } from 'chart.js';
import { MarketService } from '../service/market.service';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Table, TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';


@Component({
  selector: 'app-market',
  imports: [
    FormsModule,
    CommonModule,
    TableModule,
    SelectModule, 
    ButtonModule
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit, OnDestroy {


  // table data
  marketData: any[] = [];
  loading = false;
  totalRecords = 0;


  // filters / search
  states: string[] = [];       // optionally pre-populate
  commodities: string[] = [];  // optionally pre-populate
  selectedState = '';
  selectedCommodity = '';
  marketSearchTerm = '';
  private search$ = new Subject<string>();

  // pagination
  limit = 50;
  offset = 0;

  // auto refresh
  autoRefresh = true;
  refreshIntervalSec = 60; // seconds
  private refreshSub?: Subscription;

  // chart
  chartLabels: string[] = [];
  chartData: number[] = [];
  chartLoading = false;


  filters = {
    state: null,
    district: null,
    market: null,
    commodity: null
  };

  stateList: any[] = [];
  districtList: any[] = [];
  marketList: any[] = [];
  commodityList: any[] = [];

  originalData: any[] = [];


  constructor(private marketService: MarketService) { }

  ngOnInit(): void {
    // initial load
    this.loadData();

    // debounced search
    this.search$.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap(term => {
        this.marketSearchTerm = term;
        this.offset = 0;
        return of(null); // we trigger loadData below
      })
    ).subscribe(() => this.loadData());

    // auto-refresh
    if (this.autoRefresh) this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    if (this.refreshSub) this.refreshSub.unsubscribe();
  }

  startAutoRefresh() {
    this.stopAutoRefresh();
    this.refreshSub = interval(this.refreshIntervalSec * 1000).subscribe(() => this.loadData(false));
  }

  stopAutoRefresh() {
    if (this.refreshSub) {
      this.refreshSub.unsubscribe();
      this.refreshSub = undefined;
    }
  }

  toggleAutoRefresh() {
    this.autoRefresh = !this.autoRefresh;
    if (this.autoRefresh) this.startAutoRefresh();
    else this.stopAutoRefresh();
  }

  onSearch(term: string) {
    this.search$.next(term);
  }



  loadData(showLoader = true) {
    if (showLoader) this.loading = true;

    const opts = {
      state: this.selectedState || undefined,
      commodity: this.selectedCommodity || undefined,
      market: this.marketSearchTerm || undefined,
      limit: this.limit,
      offset: this.offset
    };

    this.marketService.getMarketRates(opts).pipe(
      catchError(err => {
        console.error('API error', err);
        return of({ records: [], total: 0 });
      })
    ).subscribe(res => {
      this.marketData = res.records || [];
      this.totalRecords = res.total || (this.marketData.length + this.offset);
      this.originalData = [...this.marketData];
      this.stateList = [...new Set(this.marketData.map(x => x.state))].map(x => ({ label: x, value: x }));
      this.commodityList = [...new Set(this.marketData.map(x => x.commodity))].map(x => ({ label: x, value: x }));

      this.loading = false;
    });
  }

  // pagination helpers
  nextPage() {
    this.offset += this.limit;
    this.loadData();
  }
  prevPage() {
    this.offset = Math.max(0, this.offset - this.limit);
    this.loadData();
  }

  // CSV export of currently visible rows
  downloadCSV() {
    if (!this.marketData || this.marketData.length === 0) return;
    const columns = ['state', 'district', 'market', 'commodity', 'variety', 'grade', 'arrival_date', 'min_price', 'max_price', 'modal_price'];
    const header = columns.join(',') + '\r\n';
    const rows = this.marketData.map(r => {
      return columns.map(c => {
        const v = r[c] ?? '';
        // escape quotes
        return `"${String(v).replace(/"/g, '""')}"`;
      }).join(',');
    }).join('\r\n');

    const csv = header + rows;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `market_data_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Chart: show modal price trend for selected single market+commodity
  loadChartFor(row: any, days = 30) {
    if (!row) return;
    this.chartLoading = true;
    const market = row.market;
    const commodity = row.commodity;
    this.marketService.getMarketTimeSeries(market, commodity, days).pipe(
      catchError(err => {
        console.error('Chart API error', err);
        return of({ records: [] });
      })
    ).subscribe(res => {
      const records = (res.records || []).slice().reverse(); // oldest-first
      this.chartLabels = records.map((r: any) => r.arrival_date);
      this.chartData = records.map((r: any) => {
        const v = r.modal_price ?? r.avg_price ?? r.median_price ?? r.max_price ?? null;
        return v ? Number(v) : null;
      });
      this.chartLoading = false;
    });
  }

  // helper to format numbers (optional)
  formatPrice(v: any) {
    if (v == null || v === '') return '-';
    const n = Number(v);
    if (Number.isNaN(n)) return String(v);
    return n.toLocaleString();
  }

  loadDistricts() {
    this.districtList = [...new Set(this.marketData.filter(
      x => (!this.filters.state || x.state === this.filters.state)
    ).map(x => x.district))].map(x => ({ label: x, value: x }));
  }

  loadMarkets() {
    this.marketList = [...new Set(this.marketData.filter(
      x => (!this.filters.district || x.district === this.filters.district)
    ).map(x => x.market))].map(x => ({ label: x, value: x }));
  }

  applyFilters() {
    this.marketData = this.originalData.filter(row =>
      (!this.filters.state || row.state === this.filters.state) &&
      (!this.filters.district || row.district === this.filters.district) &&
      (!this.filters.market || row.market === this.filters.market) &&
      (!this.filters.commodity || row.commodity === this.filters.commodity)
    );
  }

  resetFilters() {
    this.filters = { state: null, district: null, market: null, commodity: null };
    this.marketData = [...this.originalData];
    this.districtList = [];
    this.marketList = [];
  }
}

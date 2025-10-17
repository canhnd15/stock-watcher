import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from './services/api.service';
import { Page, Trade } from './models';

@Component({
  standalone: true,
  selector: 'app-trades',
  imports: [CommonModule, FormsModule],
  template: `
    <form (ngSubmit)="search()" style="display:grid; grid-template-columns: repeat(6, minmax(120px, 1fr)); gap:8px; align-items:end;">
      <div>
        <label>Code</label>
        <input class="in" [(ngModel)]="filters.code" name="code" placeholder="FPT" />
      </div>
      <div>
        <label>Type</label>
        <select class="in" [(ngModel)]="filters.type" name="type">
          <option value="">All</option>
          <option value="buy">buy</option>
          <option value="sell">sell</option>
        </select>
      </div>
      <div>
        <label>Min Volume</label>
        <input class="in" type="number" [(ngModel)]="filters.minVolume" name="minVolume" />
      </div>
      <div>
        <label>Max Volume</label>
        <input class="in" type="number" [(ngModel)]="filters.maxVolume" name="maxVolume" />
      </div>
      <div>
        <label>Min Price</label>
        <input class="in" type="number" [(ngModel)]="filters.minPrice" name="minPrice" />
      </div>
      <div>
        <label>Max Price</label>
        <input class="in" type="number" [(ngModel)]="filters.maxPrice" name="maxPrice" />
      </div>
      <div style="grid-column: 1 / -1; display:flex; gap:8px; flex-wrap: wrap; align-items:center;">
        <button type="submit">Search</button>
        <span>High volume:</span>
        <button type="button" (click)="setHighVolume(10000)">10k</button>
        <button type="button" (click)="setHighVolume(20000)">20k</button>
        <button type="button" (click)="setHighVolume(50000)">50k</button>
        <button type="button" (click)="setHighVolume(100000)">100k</button>
        <button type="button" (click)="setHighVolume(200000)">200k</button>
        <span style="margin-left:auto"></span>
        <input class="in" style="width:140px" placeholder="Ingest code..." [(ngModel)]="ingestCode" name="ingestCode" />
        <button type="button" (click)="ingest()">Ingest Now</button>
      </div>
    </form>

    <div style="margin-top:12px; overflow:auto;">
      <table class="tbl">
        <thead>
          <tr>
            <th>Time</th>
            <th>Code</th>
            <th>Side</th>
            <th style="text-align:right;">Price</th>
            <th style="text-align:right;">Volume</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let t of page?.content">
            <td>{{ t.tradeTime | date:'yyyy-MM-dd HH:mm:ss' }}</td>
            <td>{{ t.code }}</td>
            <td>{{ t.side }}</td>
            <td style="text-align:right;">{{ t.price | number:'1.0-0' }}</td>
            <td style="text-align:right;">{{ t.volume | number }}</td>
          </tr>
          <tr *ngIf="(page?.content?.length || 0) === 0">
            <td colspan="5" style="text-align:center; padding:12px; color:#666;">No data</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div style="margin-top:10px; display:flex; gap:8px; align-items:center;">
      <button (click)="prev()" [disabled]="(page?.number||0) <= 0">Prev</button>
      <span>Page {{ (page?.number||0) + 1 }} / {{ page?.totalPages || 1 }}</span>
      <button (click)="next()" [disabled]="page && (page.number + 1) >= page.totalPages">Next</button>
      <span style="margin-left:auto">Rows: </span>
      <select class="in" [(ngModel)]="filters.size" (change)="search()">
        <option [value]="20">20</option>
        <option [value]="50">50</option>
        <option [value]="100">100</option>
      </select>
    </div>
  `,
  styles: [`
    .in { width: 100%; padding:6px; box-sizing: border-box; }
    .tbl { width:100%; border-collapse: collapse; }
    .tbl th, .tbl td { border-bottom:1px solid #eee; padding:8px; }
    button { padding:6px 10px; }
  `]
})
export class TradesComponent {
  page: Page<Trade> | null = null;
  ingestCode = '';
  filters: any = {
    code: '',
    type: '',
    minVolume: undefined as number | undefined,
    maxVolume: undefined as number | undefined,
    minPrice: undefined as number | undefined,
    maxPrice: undefined as number | undefined,
    highVolume: undefined as number | undefined,
    page: 0,
    size: 20,
  };

  constructor(private api: ApiService) {
    this.search();
  }

  setHighVolume(v: number) {
    this.filters.highVolume = v;
    this.search();
  }

  search() {
    this.filters.page = 0; // reset to first page on search
    this.load();
  }

  load() {
    this.api.getTrades(this.filters).subscribe({
      next: (res) => this.page = res
    });
  }

  prev() {
    if (!this.page) return;
    if (this.page.number <= 0) return;
    this.filters.page = this.page.number - 1;
    this.load();
  }

  next() {
    if (!this.page) return;
    if (this.page.number + 1 >= this.page.totalPages) return;
    this.filters.page = this.page.number + 1;
    this.load();
  }

  ingest() {
    const code = (this.ingestCode || '').trim();
    if (!code) return;
    this.api.ingestNow(code).subscribe({
      next: () => this.load()
    });
  }
}

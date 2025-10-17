import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from './services/api.service';
import { TrackedStock } from './models';

@Component({
  standalone: true,
  selector: 'app-stocks',
  imports: [CommonModule, FormsModule],
  template: `
    <h2>Tracked Stocks</h2>

    <form (ngSubmit)="save()" style="display:grid; grid-template-columns: 1fr auto; gap:8px; align-items:start;">
      <textarea class="in" rows="4" [(ngModel)]="input" name="codes" placeholder="Enter stock codes separated by comma, space, or newline. Example: FPT, VCB, HPG"></textarea>
      <button type="submit">Save Codes</button>
    </form>

    <div style="margin-top:16px;">
      <table class="tbl">
        <thead>
          <tr>
            <th>Code</th>
            <th>Active</th>
            <th style="width:1%"></th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let s of stocks">
            <td>{{ s.code }}</td>
            <td>
              <label>
                <input type="checkbox" [(ngModel)]="s.active" name="active-{{s.code}}" (change)="toggle(s)" />
                {{ s.active ? 'Active' : 'Inactive' }}
              </label>
            </td>
            <td>
              <button (click)="ingest(s.code)">Ingest Now</button>
            </td>
          </tr>
          <tr *ngIf="stocks.length === 0">
            <td colspan="3" style="text-align:center; padding:12px; color:#666;">No tracked codes yet</td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .in { width: 100%; padding:6px; box-sizing: border-box; }
    .tbl { width:100%; border-collapse: collapse; }
    .tbl th, .tbl td { border-bottom:1px solid #eee; padding:8px; }
    button { padding:6px 10px; }
  `]
})
export class StocksComponent {
  input = '';
  stocks: TrackedStock[] = [];

  constructor(private api: ApiService) {
    this.load();
  }

  parseCodes(): string[] {
    return this.input
      .split(/[\s,\n\r]+/)
      .map(c => c.trim())
      .filter(c => !!c)
      .map(c => c.toUpperCase());
  }

  save() {
    const codes = this.parseCodes();
    if (codes.length === 0) return;
    this.api.upsertStocks(codes).subscribe({
      next: () => this.load()
    });
  }

  load() {
    this.api.listStocks().subscribe({
      next: (res) => this.stocks = res
    });
  }

  toggle(s: TrackedStock) {
    this.api.setActive(s.code, s.active).subscribe();
  }

  ingest(code: string) {
    this.api.ingestNow(code).subscribe();
  }
}

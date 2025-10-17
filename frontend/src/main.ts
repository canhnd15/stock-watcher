import { bootstrapApplication } from '@angular/platform-browser';
import { Component } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { RouterOutlet, RouterLink, provideRouter, Routes } from '@angular/router';
import { TradesComponent } from './app/trades.component';
import { StocksComponent } from './app/stocks.component';

const routes: Routes = [
  { path: '', redirectTo: 'trades', pathMatch: 'full' },
  { path: 'trades', component: TradesComponent },
  { path: 'stocks', component: StocksComponent },
];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  template: `
    <header style="padding:10px; border-bottom:1px solid #ddd; display:flex; gap:12px; align-items:center;">
      <strong>Trade Tracker</strong>
      <a routerLink="/trades">Trades</a>
      <a routerLink="/stocks">Tracked Stocks</a>
    </header>
    <main style="padding:16px;">
      <router-outlet></router-outlet>
    </main>
  `
})
class AppComponent {}

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(withFetch()),
    provideRouter(routes)
  ]
}).catch((err: unknown) => console.error(err));

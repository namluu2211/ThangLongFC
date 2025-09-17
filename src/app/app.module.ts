import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { HeaderComponent } from './core/header.component';
import { MatchInfoComponent } from './features/match-info/match-info.component';
import { PlayersComponent } from './features/players/players.component';
import { HistoryComponent } from './features/history/history.component';
import { FundComponent } from './features/fund/fund.component';
import { StatsComponent } from './features/stats/stats.component';

@NgModule({
  declarations: [],
  imports: [
    BrowserModule,
    FormsModule,
    AppComponent,
    HeaderComponent,
    MatchInfoComponent,
    PlayersComponent,
    HistoryComponent,
    FundComponent,
    StatsComponent
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }

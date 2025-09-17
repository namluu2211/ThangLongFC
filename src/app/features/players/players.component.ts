import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-players',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div>
      <h3>Danh sách cầu thủ</h3>
      <table class="table">
        <tr><th>ID</th><th>Tên</th><th>Vị trí</th></tr>
        <tr *ngFor="let p of players">
          <td>{{p.id}}</td><td>{{p.name}}</td><td>{{p.position}}</td>
        </tr>
      </table>
    </div>
  `
})
export class PlayersComponent implements OnInit {
  players: any[] = [];
  ngOnInit() {
    fetch('/assets/players.json').then(r=>r.json()).then(json=> this.players = json);
  }
}

import { Component, ChangeDetectionStrategy, Input, OnInit, ChangeDetectorRef, Type, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-players-shell',
  standalone: true,
  imports: [CommonModule],
  template: `
    <ng-container *ngIf="loaded; else loading">
      <ng-container *ngComponentOutlet="playersComponent; inputs: componentInputs"></ng-container>
    </ng-container>
    <ng-template #loading>
      <div class="players-shell-loading">
        <div class="spinner"></div>
        <div>Tải đội hình...</div>
      </div>
    </ng-template>
  `,
  styles:[`
    .players-shell-loading { display:flex; flex-direction:column; align-items:center; padding:24px; color:#444; }
    .spinner { width:32px; height:32px; border:4px solid #ccc; border-top-color:#2196f3; border-radius:50%; animation:spin 0.8s linear infinite; margin-bottom:12px; }
    @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlayersShellComponent implements OnInit {
  @Input() canEdit = false;
  playersComponent: Type<unknown> | null = null;
  loaded = false;
  componentInputs: Record<string, unknown> = {};
  private readonly cdr = inject(ChangeDetectorRef);

  async ngOnInit() {
    // Dynamically import heavy players component
    const module = await import('./players.component');
    this.playersComponent = module.PlayersComponent;
    this.componentInputs = { canEdit: this.canEdit };
    this.loaded = true;
    this.cdr.markForCheck();
  }
}

import { Component } from '@angular/core';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { CanEditDirective, CanViewOrEditDirective } from '../can-edit.directive';
import { PermissionService } from '../../core/services/permission.service';

class MockPermissionService {
  private state = { canEdit: false, role: '', loggedIn: false };
  private editListeners: ((v:boolean)=>void)[] = [];
  private authListeners: ((v:{loggedIn:boolean})=>void)[] = [];
  canEditChanges(){ return { subscribe: (fn:(v:boolean)=>void) => { this.editListeners.push(fn); fn(this.state.canEdit); return { unsubscribe: () => { this.editListeners = this.editListeners.filter(l=>l!==fn); } }; } }; }
  authChanges(){ return { subscribe: (fn:(v:{loggedIn:boolean})=>void) => { this.authListeners.push(fn); fn({loggedIn:this.state.loggedIn}); return { unsubscribe: () => { this.authListeners = this.authListeners.filter(l=>l!==fn); } }; } }; }
  getCurrent(){ return this.state; }
  setCanEdit(val:boolean){ this.state.canEdit = val; this.editListeners.forEach(l=>l(val)); }
  setLoggedIn(val:boolean){ this.state.loggedIn = val; this.authListeners.forEach(l=>l({loggedIn:val})); }
}

@Component({
  standalone: true,
  imports: [CanEditDirective, CanViewOrEditDirective],
  template: `
    <div *appCanEdit class="edit-only" id="edit">Edit Content</div>
    <div *appCanViewOrEdit class="view-or-edit" id="view">Viewer Content</div>
  <ng-template #noEditTpl><span id="noEdit">No Edit</span></ng-template>
  <div *appCanEdit="{ else: noEditTpl }" id="withElse">With Else</div>
  `
})
class HostComponent {}

describe('Permission structural directives', () => {
  let fixture: ComponentFixture<HostComponent>;
  let mock: MockPermissionService;

  beforeEach(() => {
    mock = new MockPermissionService();
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [{ provide: PermissionService, useValue: mock }]
    });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('renders edit content only when canEdit', () => {
    // Initially false
    expect(fixture.nativeElement.querySelector('#edit')).toBeNull();
    mock.setCanEdit(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#edit')).toBeTruthy();
  });

  it('renders else template when not canEdit', () => {
    // ensure starting state is cannot edit
    mock.setCanEdit(false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#noEdit')).toBeTruthy();
    mock.setCanEdit(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#noEdit')).toBeNull();
  });

  it('shows view content when logged in even if cannot edit', () => {
    expect(fixture.nativeElement.querySelector('#view')).toBeNull();
    mock.setLoggedIn(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#view')).toBeTruthy();
  });
});

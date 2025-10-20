import { Directive, TemplateRef, ViewContainerRef, Input, inject, OnDestroy } from '@angular/core';
import { PermissionService } from '../core/services/permission.service';
import { Subscription } from 'rxjs';

/**
 * Structural directive *appCanEdit
 * Usage:
 *   <button *appCanEdit>Only visible if canEdit === true</button>
 * Optional: provide an else template reference name using standard Angular syntax:
 *   <ng-template #noEdit>...</ng-template>
 *   <div *appCanEdit="else noEdit">Edit content</div>
 */
@Directive({
  selector: '[appCanEdit]',
  standalone: true
})
export class CanEditDirective implements OnDestroy {
  private tpl = inject(TemplateRef<any>);
  private vcr = inject(ViewContainerRef);
  private permission = inject(PermissionService);
  private sub: Subscription;
  private hasView = false;
  private elseTpl?: TemplateRef<any>;

  // Support *appCanEdit="{ else: someRef }"
  @Input() set appCanEdit(value: any) {
    if (value && value.else instanceof TemplateRef) {
      this.elseTpl = value.else;
    }
  }

  constructor() {
    this.sub = this.permission.canEditChanges().subscribe(can => this.update(can));
    // initial
    this.update(this.permission.getCurrent().canEdit);
  }

  private update(canEdit: boolean) {
    if (canEdit) {
      if (!this.hasView) {
        this.vcr.clear();
        this.vcr.createEmbeddedView(this.tpl);
        this.hasView = true;
      }
    } else {
      this.vcr.clear();
      if (this.elseTpl) {
        this.vcr.createEmbeddedView(this.elseTpl);
      }
      this.hasView = false;
    }
  }

  ngOnDestroy() { this.sub.unsubscribe(); }
}

/**
 * Structural directive *appCanViewOrEdit
 * Shows content if user is logged in (viewer/admin/superadmin) OR canEdit.
 * Accepts else template similar to *appCanEdit.
 */
@Directive({
  selector: '[appCanViewOrEdit]',
  standalone: true
})
export class CanViewOrEditDirective implements OnDestroy {
  private tpl = inject(TemplateRef<any>);
  private vcr = inject(ViewContainerRef);
  private permission = inject(PermissionService);
  private sub: Subscription;
  private elseTpl?: TemplateRef<any>;
  private hasView = false;

  @Input() set appCanViewOrEdit(value: any) {
    if (value && value.else instanceof TemplateRef) {
      this.elseTpl = value.else;
    }
  }

  constructor() {
    this.sub = this.permission.authChanges().subscribe(auth => this.update(auth.loggedIn));
    // initial
    this.update(this.permission.getCurrent().loggedIn);
  }

  private update(show: boolean) {
    if (show) {
      if (!this.hasView) {
        this.vcr.clear();
        this.vcr.createEmbeddedView(this.tpl);
        this.hasView = true;
      }
    } else {
      this.vcr.clear();
      if (this.elseTpl) {
        this.vcr.createEmbeddedView(this.elseTpl);
      }
      this.hasView = false;
    }
  }

  ngOnDestroy() { this.sub.unsubscribe(); }
}

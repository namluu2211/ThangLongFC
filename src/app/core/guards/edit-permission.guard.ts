import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PermissionService } from '../services/permission.service';

// Simple guard: blocks route if user cannot edit; optionally redirect to players page.
export const editPermissionGuard: CanActivateFn = () => {
  const perm = inject(PermissionService);
  const router = inject(Router);
  const snap = perm.getCurrent();
  if (snap.canEdit) return true;
  // Redirect but preserve attempted URL in query param for future upgrade.
  router.navigate(['/players'], { queryParams: { denied: '1' } });
  return false;
};

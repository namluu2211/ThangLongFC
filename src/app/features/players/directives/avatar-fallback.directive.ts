import { Directive, HostListener, Input } from '@angular/core';

@Directive({
  selector: 'img[appAvatarFallback]',
  standalone: true
})
export class AvatarFallbackDirective {
  @Input() fallbackSrc = 'assets/images/default-avatar.svg';
  private attempted = false;

  @HostListener('error', ['$event'])
  onError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (this.attempted) return;
    this.attempted = true;
    img.src = this.fallbackSrc;
  }
}

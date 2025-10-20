import { Injectable } from '@angular/core';

/**
 * Stub avatar upload service.
 * In production this would upload to Firebase Storage or another CDN.
 * For now: validates file (type/size) then returns a data URL.
 */
@Injectable({ providedIn: 'root' })
export class AvatarUploadService {
  readonly maxSizeBytes = 512 * 1024; // 512KB limit
  readonly allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

  async uploadAvatar(file: File): Promise<{ url: string; width?: number; height?: number; size: number; mime: string; }> {
    if (!file) throw new Error('No file provided');
    if (!this.allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Allowed: PNG, JPG, JPEG, WEBP');
    }
    if (file.size > this.maxSizeBytes) {
      throw new Error(`File too large. Max ${(this.maxSizeBytes/1024).toFixed(0)}KB`);
    }
    const dataUrl = await this.readFileAsDataUrl(file);
    const dims = await this.getImageDimensions(dataUrl).catch(()=>({width:undefined,height:undefined}));
    return { url: dataUrl, size: file.size, mime: file.type, ...dims };
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('File read error'));
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  }

  private getImageDimensions(dataUrl: string): Promise<{width:number;height:number}> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = () => reject(new Error('Image load error'));
      img.src = dataUrl;
    });
  }
}
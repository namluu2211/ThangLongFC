import { Injectable } from '@angular/core';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getApps } from 'firebase/app';

/**
 * Video upload service for Firebase Storage.
 * Handles video file uploads and returns Firebase Storage URLs.
 */
@Injectable({ providedIn: 'root' })
export class VideoUploadService {
  readonly maxSizeBytes = 50 * 1024 * 1024; // 50MB limit for videos
  readonly allowedTypes = [
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime', // .mov files
    'video/x-msvideo', // .avi files
  ];

  private storage: ReturnType<typeof getStorage> | null = null;

  constructor() {
    this.initializeStorage();
  }

  private initializeStorage() {
    try {
      // Check if Firebase app is already initialized
      const apps = getApps();
      if (apps.length > 0) {
        this.storage = getStorage(apps[0]);
        console.log('✅ Firebase Storage initialized (using existing app)');
      } else {
        console.warn('⚠️ Firebase app not initialized yet. Storage will be initialized when needed.');
      }
    } catch (error) {
      console.error('❌ Failed to initialize Firebase Storage:', error);
    }
  }

  private ensureStorage() {
    if (!this.storage) {
      try {
        const apps = getApps();
        if (apps.length === 0) {
          throw new Error('Firebase app not initialized. Please ensure Firebase is configured.');
        }
        this.storage = getStorage(apps[0]);
        console.log('✅ Firebase Storage initialized (lazy)');
      } catch (error) {
        console.error('❌ Failed to initialize Firebase Storage:', error);
        throw new Error('Firebase Storage is not available. Please check your Firebase configuration.');
      }
    }
  }

  async uploadVideo(file: File, playerId: string): Promise<{ url: string; size: number; mime: string; }> {
    if (!file) throw new Error('No file provided');
    
    // Ensure storage is initialized
    this.ensureStorage();
    
    if (!this.allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Allowed: MP4, WEBM, OGG, MOV');
    }
    
    if (file.size > this.maxSizeBytes) {
      throw new Error(`File too large. Max ${(this.maxSizeBytes / (1024 * 1024)).toFixed(0)}MB`);
    }

    try {
      // Create a unique filename with timestamp
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `players/${playerId}/videos/${timestamp}_${sanitizedFileName}`;
      
      // Create storage reference
      const storageRef = ref(this.storage!, storagePath);
      
      // Upload file
      const snapshot = await uploadBytes(storageRef, file, {
        contentType: file.type,
        customMetadata: {
          uploadedAt: new Date().toISOString(),
          playerId: playerId,
          originalName: file.name
        }
      });
      
      // Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      console.log('✅ Video uploaded successfully:', downloadURL);
      return {
        url: downloadURL,
        size: file.size,
        mime: file.type
      };
    } catch (error) {
      console.error('❌ Video upload error:', error);
      
      // Provide user-friendly error messages
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('storage/unauthorized')) {
        throw new Error('Upload permission denied. Please check Firebase Storage security rules.');
      } else if (errorMessage.includes('storage/quota-exceeded')) {
        throw new Error('Storage quota exceeded. Please contact administrator.');
      } else if (errorMessage.includes('network')) {
        throw new Error('Network error. Please check your connection and try again.');
      }
      
      throw new Error('Failed to upload video. Please try again.');
    }
  }

  /**
   * Validate video file before upload
   */
  validateVideo(file: File): { valid: boolean; error?: string } {
    if (!file) {
      return { valid: false, error: 'No file provided' };
    }
    
    if (!this.allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Invalid file type. Allowed: MP4, WEBM, OGG, MOV' };
    }
    
    if (file.size > this.maxSizeBytes) {
      return { 
        valid: false, 
        error: `File too large. Max ${(this.maxSizeBytes / (1024 * 1024)).toFixed(0)}MB` 
      };
    }
    
    return { valid: true };
  }

  /**
   * Get video duration from file (client-side validation)
   */
  async getVideoDuration(file: File): Promise<number> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };
      
      video.onerror = () => {
        reject(new Error('Failed to load video metadata'));
      };
      
      video.src = URL.createObjectURL(file);
    });
  }
}

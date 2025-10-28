# Video Display Feature Documentation

## Overview
Added external video URL support for player profiles with smart embedding for multiple platforms.

## Features

### 1. **Supported Video Platforms**

#### OneDrive Videos (Recommended)
- **Format:** `https://onedrive.live.com/embed?cid=...&resid=...&authkey=...`
- **Advantages:** Large file support, free storage (5GB), easy management
- **Usage:** Right-click video in OneDrive → "Embed" → Copy URL

#### Google Drive Videos
- **Format:** `https://drive.google.com/file/d/FILE_ID/view`
- **Auto-converts to:** `https://drive.google.com/file/d/FILE_ID/preview`
- **Advantages:** 15GB free storage, reliable streaming

#### YouTube Shorts
- **Format:** `https://youtube.com/shorts/VIDEO_ID`
- **Auto-embeds:** Converts to proper embed URL

#### TikTok
- **Format:** `https://www.tiktok.com/@username/video/VIDEO_ID`
- **Auto-embeds:** Converts to TikTok embed format

#### Instagram Reels
- **Format:** `https://www.instagram.com/reel/REEL_ID/`
- **Auto-embeds:** Converts to Instagram embed format

#### Facebook Videos  
- **Format:** `https://www.facebook.com/username/videos/VIDEO_ID/`
- **Auto-embeds:** Uses Facebook video plugin

### 2. **Player Data Models**
Updated interfaces to support video URLs:
- `Player` interface (player-utils.ts): Added `videoUrl?: string`
- `PlayerInfo` interface (player.model.ts): Added `videoUrl?: string`

### 3. **Players Simple Component** (`players-simple.component.ts`)

#### Smart URL Parsing:
- `getVideoEmbedUrl(url)`: Automatically detects platform and converts to embeddable URL

#### Video Display:
- Iframe embed with 9:16 aspect ratio (mobile-optimized)
- Placeholder UI when no video exists
- Responsive sizing

### 4. **User Interface**

#### Create/Edit Player Form:
```html
<label>
  <span>Video URL</span>
  <input name="videoUrl" 
         [(ngModel)]="model.videoUrl" 
         maxlength="500" 
         placeholder="OneDrive, Google Drive, YouTube Shorts, TikTok..." />
</label>
```

#### Player Detail Panel:
- Video section in "Thông tin cầu thủ" panel
- Video embed with responsive iframe
- Placeholder: "Chưa có video" when no video exists

### 5. **CSS Styling**
```css
.player-video-section { margin-top:16px; padding-top:16px; border-top:1px solid #e2e5ec; }
.video-container { position:relative; width:100%; padding-bottom:177.78%; /* 9:16 aspect ratio */ }
.video-container iframe { position:absolute; top:0; left:0; width:100%; height:100%; border-radius:12px; }
.video-placeholder { padding:40px 20px; text-align:center; background:#f9fafc; border-radius:12px; }
.video-empty-state { font-size:3rem; margin-bottom:8px; opacity:0.3; }
```

## Usage Flow

### Adding Video to Player:
1. Upload video to OneDrive/Google Drive
2. Get shareable/embed link
3. Open player form (create or edit)
4. Paste URL in "Video URL" field
5. Save player

### Viewing Player Video:
1. Click player in list
2. Detail panel opens
3. Scroll to "Video cầu thủ" section
4. Video displays with iframe embed

## Advantages of External URLs

| Feature | External URLs | Self-Hosted |
|---------|--------------|-------------|
| **Setup Required** | ✅ None | ❌ Server/storage setup |
| **File Size Limit** | ✅ Very large (GBs) | ⚠️ Server dependent |
| **Storage Cost** | ✅ Free (OneDrive/Google Drive) | ⚠️ Hosting costs |
| **Works Immediately** | ✅ Yes | ❌ Requires configuration |
| **Video Management** | ✅ Easy via cloud platform | ⚠️ Manual management |
| **Bandwidth** | ✅ Handled by platform | ⚠️ Counts against quota |

## Troubleshooting

### Video Not Displaying?
- **Check URL format**: Use embed URLs, not sharing page URLs
- **OneDrive**: Use "Embed" option, not short link (`1drv.ms`)
- **Google Drive**: Set permission to "Anyone with the link"
- **Clear and re-paste**: Sometimes URL doesn't save properly

### Video Shows "Blocked Content"?
- **Check permissions**: Video must be publicly accessible
- **Browser extensions**: Some ad blockers may block iframes
- **CORS policy**: Some platforms restrict embedding

## Security Features

1. **DomSanitizer**: All video URLs sanitized before embedding
2. **URL Validation**: Only recognized platforms allowed
3. **XSS Protection**: Angular's built-in security

## Best Practices

1. **Use OneDrive Embed URLs** - Better compatibility than short links
2. **Compress videos before upload** - Faster loading
3. **Use MP4 format** - Most compatible
4. **Keep videos under 100MB** - Better performance
5. **Test URL before saving** - Verify video plays

## Future Enhancements

### Possible Improvements:
1. **Video Preview**: Thumbnail preview in player list
2. **Multiple Videos**: Support multiple videos per player
3. **Video Playlist**: Gallery view of all player videos
4. **Download Option**: Allow downloading videos
5. **Video Duration**: Display video length
6. **Upload Progress**: For future self-hosted option

## Notes

- Videos are referenced by URL only (no local storage)
- URLs stored in Firebase Realtime Database
- No file size limits (limited by hosting platform)
- Videos hosted on external platforms (OneDrive, Google Drive, etc.)
- No Firebase Storage required
- No additional costs

---

**Updated:** October 29, 2025  
**Status:** Production Ready ✅  
**No Additional Configuration Required** 🎉

## Features

### 1. **Video Upload Service** (`video-upload.service.ts`)
- Location: `src/app/services/video-upload.service.ts`
- Firebase Storage integration for video file uploads
- Maximum file size: 50MB
- Supported formats: MP4, WEBM, OGG, MOV, QuickTime
- Storage path pattern: `players/{playerId}/videos/{timestamp}_{filename}`

#### Key Methods:
```typescript
uploadVideo(file: File, playerId: string): Promise<{url: string; size: number; mime: string}>
validateVideo(file: File): {valid: boolean; error?: string}
getVideoDuration(file: File): Promise<number>
```

### 2. **Player Data Models**
Updated interfaces to support video URLs:
- `Player` interface (player-utils.ts): Added `videoUrl?: string`
- `PlayerInfo` interface (player.model.ts): Added `videoUrl?: string`

### 3. **Players Simple Component** (`players-simple.component.ts`)

#### Upload Handlers:
- `onCreateVideoFileChange(event)`: Upload video when creating new player
- `onEditVideoFileChange(event)`: Upload video when editing existing player

#### State Properties:
- `uploadingVideoCreate: boolean` - Create form upload state
- `uploadingVideoEdit: boolean` - Edit form upload state
- `videoUploadError: string` - Error messages
- `videoUploadProgress: number` - Upload progress (0-100)

#### Video Display:
- Smart URL parsing for multiple platforms:
  - YouTube Shorts
  - TikTok
  - Instagram Reels
  - Facebook Videos
  - Direct video URLs
- Iframe embed with 9:16 aspect ratio
- Placeholder UI when no video exists

### 4. **User Interface**

#### Create Player Form:
```html
<label class="full">
  <span>Chọn video (tùy chọn, max 50MB)</span>
  <input type="file" accept="video/*" (change)="onCreateVideoFileChange($event)" />
</label>
<div *ngIf="uploadingVideoCreate">⏳ Đang tải video... {{videoUploadProgress}}%</div>
<div *ngIf="videoUploadError">❌ {{videoUploadError}}</div>
```

#### Edit Player Form:
```html
<label class="full">
  <span>Chọn video mới (tùy chọn, max 50MB)</span>
  <input type="file" accept="video/*" (change)="onEditVideoFileChange($event)" />
</label>
<div *ngIf="uploadingVideoEdit">⏳ Đang tải video... {{videoUploadProgress}}%</div>
<div *ngIf="videoUploadError">❌ {{videoUploadError}}</div>
```

#### Player Detail Panel:
- Video section in "Thông tin cầu thủ" panel
- Video embed with responsive iframe
- Placeholder: "Chưa có video" when no video exists

### 5. **CSS Styling**
```css
.player-video-section { margin-top:16px; padding-top:16px; border-top:1px solid #e2e5ec; }
.video-container { position:relative; width:100%; padding-bottom:177.78%; /* 9:16 aspect ratio */ }
.video-container iframe { position:absolute; top:0; left:0; width:100%; height:100%; border-radius:12px; }
.video-placeholder { padding:40px 20px; text-align:center; background:#f9fafc; border-radius:12px; }
.video-empty-state { font-size:3rem; margin-bottom:8px; opacity:0.3; }
.upload-progress { font-size:0.85rem; color:#1a73e8; background:#e8f0fe; padding:6px 10px; border-radius:6px; }
.upload-error { font-size:0.85rem; color:#d93025; background:#fce8e6; padding:6px 10px; border-radius:6px; }
```

## Validation Rules

### File Size:
- Maximum: 50MB (52,428,800 bytes)
- Error: "Video file is too large. Maximum size is 50MB."

### File Types:
- Allowed: video/mp4, video/webm, video/ogg, video/quicktime, video/x-msvideo
- Error: "Invalid file type. Only MP4, WEBM, OGG, and MOV videos are allowed."

## Firebase Storage Structure

```
players/
  └── {playerId}/
      └── videos/
          └── {timestamp}_{sanitizedFilename}
              - Metadata:
                  * uploadedAt: ISO timestamp
                  * playerId: string
                  * originalName: string
```

## Usage Flow

### Creating New Player:
1. User fills player form
2. User selects video file (optional)
3. Validation checks file type and size
4. Upload to Firebase Storage with temporary ID
5. Store returned URL in `createModel.videoUrl`
6. Save player with video URL to Realtime Database

### Editing Existing Player:
1. User opens edit panel
2. User selects new video file (optional)
3. Validation checks file type and size
4. Upload to Firebase Storage with player ID
5. Store returned URL in `editModel.videoUrl`
6. Update player data in Realtime Database

### Viewing Player Video:
1. User clicks player in list
2. Detail panel opens showing player info
3. If `videoUrl` exists: Display video embed
4. If no `videoUrl`: Show placeholder "Chưa có video"

## Error Handling

### Upload Errors:
- Invalid file type → Toast notification + inline error message
- File too large → Toast notification + inline error message
- Network errors → Toast notification + inline error message
- Firebase errors → Descriptive error message

### Display Errors:
- Invalid video URL → Falls back to placeholder
- Embed blocked → Browser security message shown
- Video unavailable → Placeholder displayed

## Security Features

1. **DomSanitizer**: All video URLs sanitized before embedding
2. **File Validation**: Type and size checks before upload
3. **Firebase Storage Rules**: Should be configured to require authentication
4. **Metadata Tracking**: Upload timestamp and player ID stored with video

## Testing Checklist

- [ ] Upload video when creating new player
- [ ] Upload video when editing existing player
- [ ] Validation: File size > 50MB rejected
- [ ] Validation: Non-video file rejected
- [ ] Progress indicator shows during upload
- [ ] Error messages display correctly
- [ ] Video displays in detail panel after upload
- [ ] Placeholder shows when no video exists
- [ ] External URLs (YouTube, TikTok) still work
- [ ] Video metadata saved to Firebase Storage
- [ ] Video URL saved to Realtime Database

## Future Enhancements

### Possible Improvements:
1. **Video Preview**: Show selected video before upload
2. **Duration Display**: Show video duration in detail panel
3. **Thumbnail Generation**: Auto-generate video thumbnail
4. **Delete Video**: Button to remove uploaded video
5. **Replace Video**: Better UX for replacing existing video
6. **Compression**: Client-side video compression before upload
7. **Progress Tracking**: More detailed upload progress (bytes/total)
8. **Multiple Videos**: Support multiple videos per player
9. **Video Gallery**: Grid view of all player videos
10. **Download Video**: Allow downloading uploaded videos

## Notes

- Video uploads use temporary player IDs for new players (`temp_{timestamp}`)
- Existing player videos are stored under their actual player ID
- Videos are stored separately from avatars for better organization
- Upload is async; user can continue working while video uploads
- Toast notifications provide immediate feedback
- Inline progress/error messages show upload status

# Supported Video Platforms 🎥

The player video URL feature now supports **13+ video platforms** with automatic embed conversion!

## ✅ Fully Supported Platforms

### 1. **YouTube** 🎬
- Regular videos: `https://www.youtube.com/watch?v=VIDEO_ID`
- Shorts: `https://www.youtube.com/shorts/VIDEO_ID`
- Short links: `https://youtu.be/VIDEO_ID`
- **Features**: Auto-converts to embed, hides branding, disables related videos

### 2. **TikTok** 🎵
- Regular videos: `https://www.tiktok.com/@username/video/1234567890`
- User videos: `https://www.tiktok.com/@username/video/1234567890`
- Short links: `https://vm.tiktok.com/SHORTCODE`
- **Features**: Full embed support with v2 player

### 3. **Instagram** 📸
- Reels: `https://www.instagram.com/reel/REEL_ID`
- Posts: `https://www.instagram.com/p/POST_ID`
- IGTV: `https://www.instagram.com/tv/VIDEO_ID`
- **Features**: Native Instagram embed player

### 4. **Facebook** 👍
- Regular videos: `https://www.facebook.com/username/videos/1234567890`
- Watch videos: `https://www.facebook.com/watch/?v=1234567890`
- Short links: `https://fb.watch/SHORTCODE`
- **Features**: Facebook video plugin with full controls

### 5. **Vimeo** 🎥
- Regular videos: `https://vimeo.com/123456789`
- Direct video links: `https://vimeo.com/video/123456789`
- **Features**: Clean embed player, no branding

### 6. **Dailymotion** 📺
- Regular videos: `https://www.dailymotion.com/video/VIDEO_ID`
- Short links: `https://dai.ly/VIDEO_ID`
- **Features**: Full embed support

### 7. **Twitch** 🎮
- Clips: `https://www.twitch.tv/username/clip/CLIP_ID`
- Videos: `https://www.twitch.tv/videos/1234567890`
- **Features**: Native Twitch player with parent domain setup

### 8. **Twitter/X** 🐦
- Tweet videos: `https://twitter.com/username/status/1234567890`
- X platform: `https://x.com/username/status/1234567890`
- **Note**: Embeds full tweet with video

### 9. **Streamable** 🎬
- Videos: `https://streamable.com/VIDEO_ID`
- **Features**: Fast, lightweight embed player

### 10. **Google Drive** ☁️
- Share links: `https://drive.google.com/file/d/FILE_ID/view?usp=sharing`
- Direct links: `https://drive.google.com/file/d/FILE_ID/view`
- **Features**: Auto-converts to preview mode
- **Requirements**: File must be shared publicly or with "Anyone with the link"

### 11. **OneDrive** ☁️
- Embed links: `https://onedrive.live.com/embed?cid=...&resid=...`
- Short links: `https://1drv.ms/v/s!...` (⚠️ needs embed conversion)
- **Features**: Native OneDrive video player
- **Best Practice**: Use "Embed" option from OneDrive share menu

### 12. **Dropbox** 📦
- Share links: `https://www.dropbox.com/s/FILE_ID/video.mp4?dl=0`
- **Features**: Auto-converts to direct playback link
- **Requirements**: File must be publicly shared

### 13. **Direct Video Files** 📹
- MP4: `https://example.com/video.mp4`
- WebM: `https://example.com/video.webm`
- **Features**: Native HTML5 video player

---

## 🎯 How to Use

### Adding a Video URL:

1. **When creating a player:**
   - Paste the video URL in the "Video URL" field
   - The system will automatically detect the platform
   - Video will be embedded in the player's details

2. **When editing a player:**
   - Update the "Video URL" field with the new link
   - Save changes
   - Video will update immediately

### Platform-Specific Tips:

#### YouTube
```
✅ WORKS: https://www.youtube.com/watch?v=dQw4w9WgXcQ
✅ WORKS: https://youtu.be/dQw4w9WgXcQ
✅ WORKS: https://www.youtube.com/shorts/dQw4w9WgXcQ
```

#### TikTok
```
✅ WORKS: https://www.tiktok.com/@username/video/7123456789012345678
✅ WORKS: https://vm.tiktok.com/ZMFj1Ab2c/
```

#### Instagram
```
✅ WORKS: https://www.instagram.com/reel/CxYz123AbCd/
✅ WORKS: https://www.instagram.com/p/CxYz123AbCd/
```

#### Facebook
```
✅ WORKS: https://www.facebook.com/watch/?v=1234567890
✅ WORKS: https://fb.watch/AbCdEfGhIj/
```

#### Google Drive
```
✅ WORKS: https://drive.google.com/file/d/1ZusFNB0w3hAi9P4BE_TmKs-yamTOWHjA/view
⚠️ IMPORTANT: Make sure the file is shared publicly!
```

#### OneDrive
```
✅ BEST: https://onedrive.live.com/embed?cid=...&resid=...
⚠️ OK: https://1drv.ms/v/s!... (may need manual conversion)
💡 TIP: Right-click file → "Embed" → Copy iframe src
```

---

## 🔧 Technical Details

### Auto-Conversion Process:
1. **URL Detection**: System identifies the platform from URL pattern
2. **ID Extraction**: Extracts video/file ID using regex patterns
3. **Embed Generation**: Converts to platform-specific embed URL
4. **Security**: Uses Angular's DomSanitizer for XSS protection
5. **Responsive**: 16:9 aspect ratio container for optimal display

### Supported URL Patterns:
- YouTube: 11-character video ID
- TikTok: Numeric video ID or short code
- Instagram: Alphanumeric media ID
- Facebook: Numeric video ID
- Google Drive: Alphanumeric file ID (26-33 chars)
- OneDrive: Complex resource ID with CID

### Console Logging:
The system provides detailed console logs for debugging:
- `🎥 Processing video URL:` - Shows original URL
- `✅ Platform detected` - Shows detected platform
- `⚠️ Warning` - Shows potential issues
- `❌ Error` - Shows conversion failures

---

## 🚨 Troubleshooting

### Video Not Loading?

1. **Check Privacy Settings:**
   - Google Drive: File must be "Anyone with the link"
   - OneDrive: File must be shared publicly
   - Dropbox: File must have public sharing enabled

2. **Check URL Format:**
   - Copy the share link, not the browser URL
   - Some platforms require specific link types

3. **Check Browser Console:**
   - Open Developer Tools (F12)
   - Look for red error messages
   - Check for CORS or privacy errors

4. **Platform-Specific Issues:**
   - **Twitter/X**: May require additional embed setup
   - **Twitch**: Parent domain must match your hosting
   - **OneDrive**: Short links may not work - use embed links

### Common Error Messages:

- `⚠️ Empty video URL provided` - No URL entered
- `⚠️ OneDrive short link detected` - Use embed link instead
- `❌ Could not extract Google Drive file ID` - Invalid URL format
- `No video URL found for this player` - Field is empty in database

---

## 📝 Best Practices

### For Best Performance:

1. **Use Platform's Native Share:**
   - Click "Share" button on the video
   - Copy the share link (not browser URL)

2. **Prefer Embed Links:**
   - Google Drive: Use `/preview` links
   - OneDrive: Use "Embed" option
   - Vimeo: Use player links

3. **Test Video Playback:**
   - After saving, view player details
   - Verify video loads and plays
   - Check console for warnings

4. **Keep URLs Updated:**
   - If video moves/deletes, update URL
   - Use permanent links when possible

---

## 🔮 Future Enhancements

Planned support for:
- LinkedIn videos
- Reddit videos
- Imgur videos
- Wistia
- JW Player
- Custom video servers

---

## 📚 Additional Resources

- [YouTube Embed API](https://developers.google.com/youtube/iframe_api_reference)
- [TikTok Embed](https://developers.tiktok.com/doc/embed-videos)
- [Instagram Embed](https://developers.facebook.com/docs/instagram/embedding)
- [Facebook Video Plugin](https://developers.facebook.com/docs/plugins/embedded-video-player)
- [Vimeo Embed](https://developer.vimeo.com/player/sdk)

---

**Last Updated:** October 29, 2025
**Version:** 2.0
**Maintained by:** MIA Football Club Management Team

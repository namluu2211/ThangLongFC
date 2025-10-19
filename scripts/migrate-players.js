#!/usr/bin/env node
/**
 * Player & Avatar Migration Script
 * Recreates lost migrate-players-firestore.js with Realtime DB support and avatar metadata node.
 *
 * Features:
 *  - Reads players from assets/players.json
 *  - Reads avatar images from assets/images/avatar_players
 *  - Uploads avatars to Firebase Storage (deduplicated via checksum)
 *  - Writes player profiles to Realtime Database at /players/{id}
 *  - Optional avatar metadata node /playerAvatars/{id}
 *  - Flags for dry run, force overwrite, realtime-only mode, avatars-node creation, debug logging
 *  - Supports service account for admin (node) context
 *
 * Planned Extensions (Gallery & Versioning):
 *  - Gallery images directory flag (--gallery-dir) to ingest additional media per player
 *  - Versioned avatars: /playerAvatars/{id} => { currentVersion, versions: { v1: {...}, v2: {...} } }
 *  - Generic media node: /playerMedia/{playerId}/{mediaId} storing type, checksum, urls
 *  - New flags: --media-node, --avatar-versioning
 *
 * Flags:
 *  --dry                 Perform a dry run (no writes)
 *  --force               Overwrite existing remote records
 *  --realtime-only       Skip Firestore logic (future extension)
 *  --avatars-node        Create /playerAvatars metadata entries
 *  --service-account=path Path to service account JSON (for admin rights)
 *  --debug               Verbose logging
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Firebase Admin (prefer admin SDK when service account provided)
let admin = null;
let adminApp = null;

// Parse flags
const args = process.argv.slice(2);
function hasFlag(flag) {
  return args.includes(flag) || args.some(a => a.startsWith(flag + '='));
}
function getFlagValue(flag) {
  const entry = args.find(a => a.startsWith(flag + '='));
  return entry ? entry.split('=')[1] : null;
}

const isDryRun = hasFlag('--dry');
const isForce = hasFlag('--force');
const realtimeOnly = hasFlag('--realtime-only');
const createAvatarsNode = hasFlag('--avatars-node');
const debug = hasFlag('--debug');
const serviceAccountPath = getFlagValue('--service-account');
const galleryDirFlag = getFlagValue('--gallery-dir');
const enableMediaNode = hasFlag('--media-node');
const enableAvatarVersioning = hasFlag('--avatar-versioning');

function logDebug(...msg) { if (debug) console.log('[DEBUG]', ...msg); }
function logInfo(...msg) { console.log('ℹ️', ...msg); }
function logWarn(...msg) { console.warn('⚠️', ...msg); }
function logError(...msg) { console.error('❌', ...msg); }

async function initFirebase() {
  if (!serviceAccountPath) {
    logWarn('No --service-account provided. Will attempt client SDK (limited) or fail gracefully.');
    return;
  }
  const fullPath = path.resolve(serviceAccountPath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Service account file not found: ${fullPath}`);
  }
  admin = require('firebase-admin');
  const serviceAccount = require(fullPath);
  if (!serviceAccount.project_id) {
    throw new Error('Service account JSON missing project_id.');
  }
  adminApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: `${serviceAccount.project_id}.appspot.com`,
    databaseURL: process.env.NG_APP_FIREBASE_DATABASE_URL || `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com`
  });
  logInfo('Firebase Admin initialized for project', serviceAccount.project_id);
}

function computeChecksum(buffer) {
  return crypto.createHash('md5').update(buffer).digest('hex');
}

function readPlayersJson() {
  const playersPath = path.join(__dirname, '..', 'src', 'assets', 'players.json');
  if (!fs.existsSync(playersPath)) {
    throw new Error('players.json not found at ' + playersPath);
  }
  const raw = fs.readFileSync(playersPath, 'utf8');
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error('players.json must contain an array');
  logInfo(`Loaded ${data.length} players from assets.`);
  return data;
}

function normalizePlayer(raw) {
  const now = new Date().toISOString();
  return {
    id: String(raw.id || raw.ID || crypto.randomUUID()),
    firstName: raw.firstName || raw.first_name || '',
    lastName: raw.lastName || raw.last_name || '',
    fullName: raw.fullName || `${raw.firstName || ''} ${raw.lastName || ''}`.trim(),
    position: raw.position || raw.role || 'Chưa xác định',
    dateOfBirth: raw.dateOfBirth || raw.DOB || '',
    height: raw.height || 0,
    weight: raw.weight || 0,
    avatar: raw.avatar || '',
    isRegistered: raw.isRegistered !== undefined ? raw.isRegistered : true,
    status: raw.status || 'active',
    stats: raw.stats || {
      totalMatches: 0, wins: 0, draws: 0, losses: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0,
      teamAMatches: 0, teamBMatches: 0, winRate: 0, averageGoalsPerMatch: 0, averageAssistsPerMatch: 0,
      disciplinaryScore: 0, totalRevenue: 0, totalPenalties: 0, netContribution: 0, currentStreak: 0
    },
    notes: raw.notes || raw.note || '',
    createdAt: raw.createdAt || now,
    updatedAt: raw.updatedAt || now
  };
}

function readAvatarImages() {
  const avatarDir = path.join(__dirname, '..', 'src', 'assets', 'images', 'avatar_players');
  if (!fs.existsSync(avatarDir)) {
    logWarn('Avatar directory missing: ' + avatarDir);
    return [];
  }
  const files = fs.readdirSync(avatarDir).filter(f => /\.(png|jpe?g|webp)$/i.test(f));
  logInfo(`Found ${files.length} avatar image files.`);
  return files.map(fileName => {
    const fullPath = path.join(avatarDir, fileName);
    const buffer = fs.readFileSync(fullPath);
    return {
      fileName,
      fullPath,
      checksum: computeChecksum(buffer),
      buffer
    };
  });
}

async function uploadAvatarIfNeeded(avatar, bucket) {
  // avatar: { fileName, checksum, buffer }
  const ext = path.extname(avatar.fileName).toLowerCase();
  const remotePath = `avatars/${avatar.checksum}${ext}`;

  const file = bucket.file(remotePath);
  const [exists] = await file.exists();
  if (exists && !isForce) {
    logDebug(`Skip upload (exists) ${remotePath}`);
  } else if (!isDryRun) {
    await file.save(avatar.buffer, { contentType: contentTypeForExt(ext), resumable: false, public: true });
    logInfo(`Uploaded avatar ${avatar.fileName} -> ${remotePath}`);
  }
  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${remotePath}`;
  return { remotePath, publicUrl };
}

function contentTypeForExt(ext) {
  switch (ext) {
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.webp': return 'image/webp';
    default: return 'application/octet-stream';
  }
}

function readGalleryImages() {
  if (!galleryDirFlag) return [];
  const fullGalleryPath = path.isAbsolute(galleryDirFlag) ? galleryDirFlag : path.join(process.cwd(), galleryDirFlag);
  if (!fs.existsSync(fullGalleryPath)) {
    logWarn('Gallery dir not found: ' + fullGalleryPath);
    return [];
  }
  const files = fs.readdirSync(fullGalleryPath).filter(f => /\.(png|jpe?g|webp)$/i.test(f));
  logInfo(`Gallery: Found ${files.length} media files.`);
  return files.map(fileName => {
    const fullPath = path.join(fullGalleryPath, fileName);
    const buffer = fs.readFileSync(fullPath);
    return { fileName, fullPath, buffer, checksum: computeChecksum(buffer) };
  });
}

async function uploadGalleryMedia(media, bucket) {
  const ext = path.extname(media.fileName).toLowerCase();
  const remotePath = `media/${media.checksum}${ext}`;
  const file = bucket.file(remotePath);
  const [exists] = await file.exists();
  if (exists && !isForce) {
    logDebug(`Skip gallery upload (exists) ${remotePath}`);
  } else if (!isDryRun) {
    await file.save(media.buffer, { contentType: contentTypeForExt(ext), resumable: false, public: true });
    logInfo(`Uploaded gallery media ${media.fileName} -> ${remotePath}`);
  }
  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${remotePath}`;
  return { remotePath, publicUrl };
}

async function run() {
  console.log('🚀 Starting Player & Avatar Migration');
  console.log('Flags:', { isDryRun, isForce, realtimeOnly, createAvatarsNode, enableMediaNode, enableAvatarVersioning, galleryDirFlag, debug });

  await initFirebase();
  if (!adminApp) {
    logError('Firebase Admin not initialized. Provide --service-account to proceed.');
    if (!serviceAccountPath) {
      logError('Missing service account prevents Realtime DB & Storage operations. Aborting.');
      process.exit(1);
    }
  }

  const db = admin.database();
  const bucket = admin.storage().bucket();

  const rawPlayers = readPlayersJson();
  const players = rawPlayers.map(normalizePlayer);
  const avatars = readAvatarImages();
  const galleryMedia = readGalleryImages();

  // Map avatars by original filename (without extension) or by ID reference
  const avatarIndex = new Map();
  avatars.forEach(a => {
    const base = path.basename(a.fileName).replace(/\.(png|jpe?g|webp)$/i, '');
    avatarIndex.set(base.toLowerCase(), a);
  });

  let migratedPlayers = 0;
  let migratedAvatars = 0;

  for (const player of players) {
    try {
      // Decide avatar mapping key
      const avatarKeyCandidates = [player.avatar, player.fullName, player.firstName + '_' + player.lastName, player.id];
      let matchedAvatar = null;
      for (const key of avatarKeyCandidates) {
        if (!key) continue;
        const normalized = String(key).toLowerCase().replace(/\s+/g, '_');
        if (avatarIndex.has(normalized)) {
          matchedAvatar = avatarIndex.get(normalized);
          break;
        }
      }

      let avatarMeta = null;
      if (matchedAvatar) {
        avatarMeta = await uploadAvatarIfNeeded(matchedAvatar, bucket);
      } else {
        logDebug('No matching avatar image found for player', player.id, player.fullName);
      }

      // Write player to Realtime DB
      const playerRef = db.ref(`players/${player.id}`);
      const existingSnap = await playerRef.get();
      if (existingSnap.exists() && !isForce) {
        logDebug('Skipping player (exists):', player.id);
      } else if (isDryRun) {
        logInfo(`[DRY] Would write player ${player.id}`);
      } else {
        const payload = { ...player };
        if (avatarMeta) {
          payload.avatarURL = avatarMeta.publicUrl;
          payload.avatarChecksum = matchedAvatar.checksum;
        }
        await playerRef.set(payload);
        migratedPlayers++;
        logInfo('Player written:', player.id);
      }

      // Avatar metadata node
      if (createAvatarsNode && matchedAvatar) {
        const avatarRef = db.ref(`playerAvatars/${player.id}`);
        const nowISO = new Date().toISOString();
        let avatarPayload = {
          playerId: player.id,
          checksum: matchedAvatar.checksum,
          originalFileName: matchedAvatar.fileName,
          storagePath: avatarMeta.remotePath,
          downloadURL: avatarMeta.publicUrl,
          updatedAt: nowISO
        };
        if (enableAvatarVersioning) {
          const versionKey = `v${Date.now()}`;
          avatarPayload = {
            ...avatarPayload,
            currentVersion: versionKey,
            versions: {
              [versionKey]: {
                checksum: matchedAvatar.checksum,
                storagePath: avatarMeta.remotePath,
                downloadURL: avatarMeta.publicUrl,
                updatedAt: nowISO
              }
            }
          };
        }
        if (isDryRun) {
          logInfo(`[DRY] Would write avatar metadata${enableAvatarVersioning ? ' (versioned)' : ''} for ${player.id}`);
        } else {
          await avatarRef.set(avatarPayload);
          migratedAvatars++;
          logInfo(`Avatar metadata${enableAvatarVersioning ? ' (versioned)' : ''} written for player:`, player.id);
        }
      }

      if (enableMediaNode && galleryMedia.length) {
        const normalizedName = player.fullName ? player.fullName.toLowerCase().replace(/\s+/g, '_') : '';
        const mediaForPlayer = galleryMedia.filter(m => {
          const base = path.basename(m.fileName).toLowerCase();
          return base.startsWith(player.id.toLowerCase()) || (normalizedName && base.startsWith(normalizedName));
        });
        for (const media of mediaForPlayer) {
          try {
            const uploaded = await uploadGalleryMedia(media, bucket);
            const mediaId = media.checksum;
            const mediaRef = db.ref(`playerMedia/${player.id}/${mediaId}`);
            const mediaPayload = {
              mediaId,
              playerId: player.id,
              fileName: media.fileName,
              storagePath: uploaded.remotePath,
              downloadURL: uploaded.publicUrl,
              checksum: media.checksum,
              type: 'gallery',
              createdAt: new Date().toISOString()
            };
            if (isDryRun) {
              logInfo(`[DRY] Would write gallery media ${media.fileName} for player ${player.id}`);
            } else {
              await mediaRef.set(mediaPayload);
              logInfo(`Gallery media written (${media.fileName}) for player ${player.id}`);
            }
          } catch (e) {
            logError('Failed gallery media migration for player', player.id, media.fileName, e.message);
          }
        }
      }
    } catch (e) {
      logError('Failed to migrate player', player.id, e.message);
    }
  }

  console.log('\n✅ Migration complete');
  console.log('Players processed:', players.length, 'migrated:', migratedPlayers);
  if (createAvatarsNode) {
    console.log('Avatar metadata migrated:', migratedAvatars);
  }
  if (isDryRun) console.log('Dry run - no remote writes performed.');
}

run().catch(err => {
  logError('Migration fatal error:', err);
  process.exit(1);
});

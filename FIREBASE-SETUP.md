# Firebase Configuration Setup Guide

## Problem
Your ThangLong FC app is getting `Firebase: Error (auth/invalid-api-key)` because the Firebase configuration is not properly set up for production deployment.

## Root Cause
The environment files were using empty strings instead of placeholder values that your build script can replace with actual Firebase configuration.

## Solutions

### ✅ Fixed Issues
1. **Environment Files Updated**: Both `environment.ts` and `environment.prod.ts` now use proper placeholder syntax (`{{NG_APP_FIREBASE_API_KEY}}`) that your build script can replace.

### 🔧 Required Actions

#### For Production Deployment (GitHub Actions)
Your GitHub repository needs these secrets configured:

1. Go to your GitHub repository: `https://github.com/namluu2211/ThangLongFC`
2. Navigate to **Settings** > **Secrets and variables** > **Actions**
3. Add the following **Repository Secrets**:

#### For Local Development
1. Copy `.env.local.template` to `.env.local`
2. Fill in your Firebase project configuration values
3. Get these values from [Firebase Console](https://console.firebase.google.com/) > Project Settings > General tab

#### Where to Get Firebase Configuration Values
1. Visit [Firebase Console](https://console.firebase.google.com/)
2. Select project **mia-fcm-d8555**
3. Go to **Project Settings** (gear icon) > **General** tab
4. Scroll down to **Your apps** section
5. Click on your web app (or create one if it doesn't exist)
6. Copy the configuration values from the Firebase SDK setup


## Testing the Fix

### Local Testing
```bash
# Create .env.local with your Firebase config
npm run start:env
```

### Production Testing
After setting up GitHub Secrets:
1. Push changes to main branch
2. GitHub Actions will automatically deploy to Firebase Hosting
3. Visit `https://mia-fc-management.web.app/` to verify Firebase authentication works

## Build Process Explanation
Your custom `scripts/build-with-env.js` script:
1. Loads environment variables from `.env.local` (local) or GitHub Secrets (CI/CD)
2. Replaces placeholder values like `{{NG_APP_FIREBASE_API_KEY}}` in environment files
3. Builds the Angular application with proper Firebase configuration
4. Restores original environment files after build

## Next Steps
1. **Immediate**: Configure GitHub Secrets for production deployment
2. **For development**: Create `.env.local` file with your Firebase configuration
3. **Test**: Redeploy and verify the authentication error is resolved

## Security Notes
- ✅ Environment files use placeholders and are safe to commit
- ✅ `.env.local` is ignored by git and won't be committed
- ✅ GitHub Secrets are encrypted and only accessible during CI/CD
- ✅ Build script cleans up environment files after processing
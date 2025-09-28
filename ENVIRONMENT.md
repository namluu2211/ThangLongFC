# ThangLong FC Environment Configuration Guide

## 🔒 Security Best Practices

This project follows security best practices by **never committing sensitive credentials** to version control. All sensitive data is loaded from environment variables.

## 📁 Environment Files Structure

```
├── .env.example              # ✅ Safe template (committed)
├── .env.local               # ❌ Never commit (contains real secrets)
├── src/environments/
│   ├── environment.ts       # ✅ Contains placeholders only
│   └── environment.prod.ts  # ✅ Contains placeholders only
```

## 🛠️ Local Development Setup

1. **Copy the example file:**
   ```bash
   cp .env.example .env.local
   ```

2. **Fill in your Firebase credentials:**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Select your project → Project Settings → General
   - Scroll to "Your apps" → Web App → Firebase SDK snippet → Config
   - Copy the values to your `.env.local` file

3. **Your `.env.local` should look like:**
   ```bash
   NG_APP_API_URL=https://api.yourdomain.com
   NG_APP_FIREBASE_API_KEY=AIza...
   NG_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   # ... etc
   ```

## 🚀 GitHub Actions Setup (CI/CD)

To deploy via GitHub Actions, add these secrets to your repository:

### Repository Secrets Path
`Settings` → `Secrets and variables` → `Actions` → `New repository secret`

### Required Secrets
```
NG_APP_API_URL
NG_APP_FIREBASE_API_KEY
NG_APP_FIREBASE_AUTH_DOMAIN
NG_APP_FIREBASE_DATABASE_URL
NG_APP_FIREBASE_PROJECT_ID
NG_APP_FIREBASE_STORAGE_BUCKET
NG_APP_FIREBASE_MESSAGING_SENDER_ID
NG_APP_FIREBASE_APP_ID
NG_APP_FIREBASE_MEASUREMENT_ID
FIREBASE_SERVICE_ACCOUNT_MIA_FCM_D8555  # For deployment
```

## 🔄 How It Works

1. **Build Process:** 
   - The `build-with-env.js` script loads environment variables
   - Replaces `{{PLACEHOLDER}}` tokens in environment files
   - Runs the Angular build
   - Restores original files (cleanup)

2. **Development:**
   - Loads from `.env.local` file
   - Falls back to system environment variables

3. **Production/CI:**
   - Uses GitHub Secrets (injected as environment variables)
   - No files need to be modified in CI environment

## ⚠️ Security Notes

- **NEVER** commit `.env.local` to Git
- **NEVER** put real credentials in `environment.ts` or `environment.prod.ts`
- **ALWAYS** use the placeholder format: `{{NG_APP_VARIABLE_NAME}}`
- **ROTATE** credentials if accidentally committed

## 🔧 Troubleshooting

### Build fails with "{{PLACEHOLDER}} not replaced"
- Check that your variable names match exactly
- Ensure `.env.local` exists and has correct format
- Verify environment variable names start with `NG_APP_`

### Firebase connection fails
- Verify all Firebase credentials are correct
- Check Firebase project permissions
- Ensure Database Rules allow your authentication method

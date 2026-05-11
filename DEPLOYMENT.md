# LCPS ERP — Production Deployment Guide

## Latex Compounding Production Scheduling ERP System

**Architecture:** Next.js + Firebase (Firestore) + AG Grid + Zustand

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Environment Setup](#2-environment-setup)
3. [Firebase Configuration](#3-firebase-configuration)
4. [GitHub Repository Setup](#4-github-repository-setup)
5. [Vercel Deployment](#5-vercel-deployment)
6. [Post-Deployment Verification](#6-post-deployment-verification)
7. [Multi-Device Testing](#7-multi-device-testing)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Prerequisites

### Required Accounts

- [GitHub](https://github.com) account
- [Vercel](https://vercel.com) account (sign up with GitHub)
- [Firebase](https://firebase.google.com) project
- [Google Cloud](https://cloud.google.com) billing (for production Firebase)

### Local Requirements

```bash
# Node.js 18+ installed
node --version  # Should show v18.x.x or higher

# npm or yarn
npm --version   # Should show 9.x.x or higher

# Git installed
git --version   # Should show 2.x.x or higher
```

---

## 2. Environment Setup

### 2.1 Create .env.local File

Create a file named `.env.local` in the project root:

```env
# Firebase Configuration (Public - safe to expose)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef123456

# Optional: Enable Firebase emulators in development
NEXT_PUBLIC_USE_EMULATORS=false

# Optional: Analytics
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

**IMPORTANT:**
- All `NEXT_PUBLIC_` variables are exposed to the browser (required for Firebase client-side)
- Never commit `.env.local` to Git (it's in .gitignore)
- Each environment (dev, staging, prod) needs its own Firebase project

### 2.2 Get Firebase Config

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the gear icon ⚙️ → Project settings
4. Under "Your apps", select the web app
5. Copy the config values to `.env.local`

---

## 3. Firebase Configuration

### 3.1 Enable Authentication

1. Firebase Console → Authentication → Get started
2. Enable **Email/Password** provider
3. Enable **Google** provider (recommended for production)
4. Add authorized domains:
   - `localhost` (for development)
   - `127.0.0.1` (for local preview)
   - `*.vercel.app` (for Vercel deployments)
   - Your custom domain (if using one)

### 3.2 Create Firestore Database

1. Firebase Console → Firestore Database → Create database
2. Choose **production mode** or **test mode**
   - **Production mode**: Secure by default, requires rules configuration
   - **Test mode**: Open access for 30 days (good for initial testing)
3. Select region: `asia-southeast1` (Singapore) or nearest to your users

### 3.3 Set Up Firestore Security Rules

Firebase Console → Firestore Database → Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - only authenticated users
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Planning sheets - authenticated users
    match /planning_sheets/{sheetId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
      allow delete: if request.auth != null;
      
      // Batches subcollection
      match /batches/{batchId} {
        allow read: if request.auth != null;
        allow create: if request.auth != null;
        allow update: if request.auth != null;
        allow delete: if request.auth != null;
      }
    }
    
    // Audit logs - read only for authenticated users
    match /audit_logs/{logId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Settings - admin only (implement role check)
    match /settings/{settingId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null; // Add admin check in production
    }
  }
}
```

**Note:** These are basic rules. For production, add role-based access control.

### 3.4 Enable Firebase Storage (Optional)

1. Firebase Console → Storage → Get started
2. Choose default bucket location
3. Set security rules for file uploads

---

## 4. GitHub Repository Setup

### 4.1 Initialize Git Repository

```bash
# Navigate to project directory
cd lcps-erp

# Initialize git (if not already done)
git init

# Create .gitignore (if not exists)
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.pnp
.pnp.js

# Production build
.next/
out/
build/
dist/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Testing
coverage/
.nyc_output/

# Logs
logs/
*.log

# Vercel
.vercel
EOF
```

### 4.2 Create GitHub Repository

```bash
# Add all files
git add .

# Commit
git commit -m "Initial commit: LCPS ERP production-ready"

# Add remote (replace with your GitHub repo URL)
git remote add origin https://github.com/YOUR_USERNAME/lcps-erp.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### 4.3 Branch Strategy (Recommended)

```bash
# Create development branch
git checkout -b develop
git push -u origin develop

# Feature branch workflow
git checkout -b feature/new-feature-name
# Make changes
git add .
git commit -m "Add new feature"
git push origin feature/new-feature-name
# Create Pull Request on GitHub
```

---

## 5. Vercel Deployment

### 5.1 Import Project to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New Project**
3. Import from GitHub → Select `lcps-erp` repository
4. Configure Project:
   - Framework Preset: Next.js
   - Root Directory: `./` (or `lcps-erp` if in subdirectory)
   - Build Command: `next build`
   - Output Directory: `.next`

### 5.2 Add Environment Variables

In Vercel project settings, add all `NEXT_PUBLIC_FIREBASE_*` variables from `.env.local`:

```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

**Path:** Vercel Dashboard → Project → Settings → Environment Variables

### 5.3 Deploy

1. Click **Deploy**
2. Wait for build to complete (2-5 minutes)
3. Vercel provides a URL: `https://your-project.vercel.app`

### 5.4 Custom Domain (Optional)

1. Vercel Dashboard → Project → Settings → Domains
2. Add your domain (e.g., `erp.yourcompany.com`)
3. Follow DNS configuration instructions
4. Add domain to Firebase Auth authorized domains

---

## 6. Post-Deployment Verification

### 6.1 Basic Functionality Checklist

- [ ] Application loads without errors
- [ ] Login page accessible
- [ ] Email/password registration works
- [ ] Google Sign-In works (if enabled)
- [ ] Dashboard loads after login
- [ ] Planning sheets can be created
- [ ] Batches can be added
- [ ] AG Grid displays correctly
- [ ] Realtime updates work (open in two browsers)
- [ ] Timeline view accessible
- [ ] Settings page accessible (admin)

### 6.2 Security Checklist

- [ ] Firestore rules are active
- [ ] Only authenticated users can access data
- [ ] `.env.local` not in Git repository
- [ ] No API keys exposed in client code (except NEXT_PUBLIC ones)
- [ ] HTTPS enforced (Vercel does this automatically)
- [ ] CORS configured properly

### 6.3 Performance Checklist

- [ ] First load under 3 seconds
- [ ] AG Grid renders smoothly
- [ ] Realtime updates are instant
- [ ] No console errors
- [ ] Lighthouse score > 80

### 6.4 Multi-Device Testing

Test on these devices/browsers:

**Desktop:**
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Edge (latest)
- [ ] Safari (latest)

**Tablet:**
- [ ] iPad Safari
- [ ] Android Chrome

**Mobile:**
- [ ] iPhone Safari
- [ ] Android Chrome

**Screen Sizes:**
- [ ] 1920x1080 (Desktop)
- [ ] 1366x768 (Laptop)
- [ ] 1024x768 (Tablet)
- [ ] 375x667 (Mobile)

---

## 7. Multi-Device Testing

### 7.1 Simultaneous User Testing

1. Open the app on 3 different devices/browsers
2. Login with different accounts (or same account)
3. Create a planning sheet on Device A
4. Verify it appears on Device B and C in real-time
5. Add a batch on Device B
6. Verify it appears on Device A and C
7. Edit a cell on Device C
8. Verify changes sync to Device A and B

### 7.2 Offline/Online Testing

1. Open app on mobile
2. Turn off WiFi (offline mode)
3. Make some edits (should be queued)
4. Turn on WiFi
5. Verify edits sync when back online

### 7.3 Session Persistence Test

1. Login on Device A
2. Close browser
3. Reopen browser and navigate to app
4. Should still be logged in (session persistence)

---

## 8. Troubleshooting

### Common Issues

#### Issue: "Firebase not initialized" error

**Solution:**
- Check all `NEXT_PUBLIC_FIREBASE_*` env vars are set in Vercel
- Verify Firebase project exists and is not deleted
- Check browser console for specific error

#### Issue: "Permission denied" on Firestore

**Solution:**
- Check Firestore rules are published (not just in editor)
- Verify user is authenticated before accessing data
- Check rules match the collections being accessed

#### Issue: Google Sign-In not working

**Solution:**
- Add Vercel domain to Firebase Auth → Settings → Authorized domains
- Enable Google provider in Firebase Auth
- Check browser console for error codes

#### Issue: Realtime updates not working

**Solution:**
- Check Firestore rules allow read access
- Verify `onSnapshot` listeners are set up correctly
- Check browser console for websocket errors
- Try refreshing the page

#### Issue: Build fails on Vercel

**Solution:**
- Check `next.config.ts` is valid
- Verify all dependencies in `package.json`
- Check build logs for specific errors
- Ensure Node.js version compatibility

#### Issue: Mobile layout broken

**Solution:**
- Check responsive CSS in `globals.css`
- Verify viewport meta tag is set
- Test on actual device (not just Chrome DevTools)

### Getting Help

- **Firebase:** [Firebase Support](https://firebase.google.com/support)
- **Vercel:** [Vercel Docs](https://vercel.com/docs)
- **Next.js:** [Next.js Docs](https://nextjs.org/docs)
- **AG Grid:** [AG Grid Docs](https://www.ag-grid.com/documentation/)

---

## Production Deployment Checklist

Before marking deployment as complete:

### Pre-Deployment
- [ ] All environment variables configured in Vercel
- [ ] Firebase Auth enabled with providers
- [ ] Firestore database created with rules
- [ ] Git repository pushed to GitHub
- [ ] Application builds locally without errors (`npm run build`)
- [ ] All tests passing (if applicable)

### Deployment
- [ ] Project imported to Vercel
- [ ] Build successful
- [ ] Domain configured (optional)
- [ ] SSL certificate active (Vercel provides this)

### Post-Deployment
- [ ] Homepage loads
- [ ] Authentication works
- [ ] Dashboard accessible
- [ ] Planning sheets functional
- [ ] AG Grid responsive
- [ ] Realtime sync verified (multiple devices)
- [ ] Mobile layout tested
- [ ] Tablet layout tested
- [ ] Print styles tested
- [ ] PWA manifest working
- [ ] Error boundaries tested

### Security
- [ ] Firestore rules reviewed
- [ ] No secrets in Git
- [ ] HTTPS only
- [ ] XSS protections active (built into Next.js)

### Documentation
- [ ] Deployment guide updated
- [ ] Environment variables documented
- [ ] Troubleshooting steps tested

---

## Continuous Deployment

### Automatic Deploys

Vercel automatically deploys when you push to GitHub:

```bash
# Make changes
git add .
git commit -m "Update feature"
git push origin main

# Vercel automatically deploys
```

### Preview Deployments

Pull requests get automatic preview URLs:

```bash
# Create feature branch
git checkout -b feature/new-ui
git push origin feature/new-ui

# Create Pull Request on GitHub
# Vercel creates preview deployment
# Test at: https://lcps-erp-git-feature-new-ui.vercel.app
```

---

## Support & Maintenance

### Regular Tasks

- [ ] Monitor Firebase usage (Firestore reads/writes)
- [ ] Check Vercel analytics
- [ ] Review error logs
- [ ] Update dependencies monthly
- [ ] Backup Firestore data weekly

### Scaling Considerations

Current architecture supports:
- **Users:** 100+ concurrent (Firebase Auth limit is high)
- **Batches:** 10,000+ per planning sheet (AG Grid handles this)
- **Planning Sheets:** Unlimited
- **Realtime:** Firestore handles real-time sync automatically

When scaling beyond this:
- Consider Firestore indexing for complex queries
- Implement pagination for large datasets
- Add caching layer (Firebase supports this)
- Monitor Firebase billing

---

**Document Version:** 1.0  
**Last Updated:** May 2026  
**System:** LCPS ERP v1.0

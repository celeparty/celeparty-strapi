# 🚀 PRODUCTION DEPLOYMENT - QUICK DEPLOY INSTRUCTIONS

## 🔴 Current Status on Production

**Error:** Cannot find module
```
at Object.<anonymous> (/var/www/papi.celeparty.com/app/src/api/transaction/content-types/transaction/lifecycles.js:1:43)
```

**Reason:** Code on production server is outdated. Need to pull latest git changes.

---

## ✅ Fix - Already Committed & Pushed

**Commit:** `c3b7996` - "Fix: Use path.join for robust module path resolution in production"

**What was fixed:**
- `src/api/transaction/content-types/transaction/lifecycles.js` - Line 1-2 now uses `path.join(__dirname, ...)`
- `src/api/transaction-ticket/content-types/transaction-ticket/lifecycles.js` - Line 5-6 now uses `path.join(__dirname, ...)`

---

## 🎯 Production Deployment Command

Run this on your Ubuntu production server:

```bash
#!/bin/bash

echo "🚀 Starting CELEPARTY Production Fix Deployment..."
echo "=================================================="

# Navigate to backend directory
cd /var/www/papi.celeparty.com/app

echo ""
echo "📥 Step 1: Pulling latest code from git..."
git pull origin main

if [ $? -eq 0 ]; then
  echo "✅ Code pulled successfully"
else
  echo "❌ Git pull failed!"
  exit 1
fi

echo ""
echo "🧹 Step 2: Clearing cache..."
rm -rf .cache/ 2>/dev/null
echo "✅ Cache cleared"

echo ""
echo "🔨 Step 3: Building Strapi..."
npm run build

if [ $? -eq 0 ]; then
  echo "✅ Build successful"
else
  echo "❌ Build failed!"
  exit 1
fi

echo ""
echo "🔄 Step 4: Restarting Strapi with PM2..."
pm2 restart strapi

echo "⏳ Waiting for Strapi to start (30 seconds)..."
sleep 30

echo ""
echo "📊 Step 5: Checking service status..."
pm2 status

echo ""
echo "📋 Step 6: Checking recent logs..."
pm2 log strapi --lines 20

echo ""
echo "🎉 Deployment complete!"
echo "=================================================="
echo "✅ Strapi should now be running successfully"
echo "✅ Monitor logs: pm2 log strapi"
```

---

## 📋 One-Line Quick Deploy

If you just want to get it running quickly:

```bash
cd /var/www/papi.celeparty.com/app && git pull origin main && npm run build && pm2 restart strapi
```

---

## 🧪 Verification After Deployment

After running the deployment, verify with:

```bash
# Check if Strapi is running
pm2 status

# Check recent logs (should NOT show module errors)
pm2 log strapi | tail -50

# Test API endpoint
curl http://localhost:1337/api/transactions

# Check admin panel
curl -I http://localhost:1337/admin
```

**Expected output:**
- ✅ `pm2 status` should show `strapi` as `online`
- ✅ `pm2 log strapi` should NOT show "Cannot find module" errors
- ✅ API endpoints should respond (even with 401 if auth required)
- ✅ Admin should respond with redirect or 200

---

## 📝 What Changed in the Fix

### Before (Broken):
```javascript
// Line 1-2 of transaction/lifecycles.js
const { generateProfessionalTicketPDF } = require('../../../transaction-ticket/utils/generateProfessionalTicketPDF');
```

**Problem:** Relative path doesn't work reliably in production

### After (Fixed):
```javascript
// Line 1-2 of transaction/lifecycles.js
const path = require('path');
const { generateProfessionalTicketPDF } = require(path.join(__dirname, '../../transaction-ticket/utils/generateProfessionalTicketPDF'));
```

**Solution:** Uses `path.join(__dirname, ...)` which resolves to absolute path at runtime and works on all platforms (Linux/Windows/macOS)

---

## ⚡ Quick Reference

| Step | Command | Expected Time |
|------|---------|-----------------|
| Pull code | `git pull origin main` | 1 min |
| Clear cache | `rm -rf .cache/` | <1 min |
| Build | `npm run build` | 5 min |
| Restart PM2 | `pm2 restart strapi` | 1 min |
| **Total** | **All above** | **~10 min** |

---

## ✅ Success Indicators

After deployment is complete:

```
✅ No "Cannot find module" errors
✅ Strapi process shows "online" in pm2 status
✅ API endpoints responding
✅ Email sending working
✅ PDF generator working
```

---

## 🔍 Troubleshooting

### If Strapi still doesn't start:
```bash
# Check detailed error
pm2 log strapi

# Check Node.js version (needs v18+)
node --version

# Check if ports are available
lsof -i :1337
```

### If git pull fails:
```bash
# Check git status
git status

# Check remote
git remote -v

# Force pull if local changes exist
git checkout -- .
git pull origin main
```

### If build fails:
```bash
# Clear node_modules cache
rm -rf node_modules/.cache

# Retry build
npm run build

# If still fails, check disk space
df -h
```

---

## 📞 Need Help?

If deployment doesn't work:

1. Check logs: `pm2 log strapi`
2. Check status: `pm2 status`
3. Check git: `git log --oneline | head -1`
4. Verify commit has fix: `git diff HEAD~1 src/api/transaction/content-types/transaction/lifecycles.js`

---

## 🎉 Expected Result

After successful deployment:

```
pm2 status:
⚙ apps started      ✓
app name    version  pid    status    restart  uptime
strapi      N/A      XXXX   online    0        0h 5m
```

And logs show:
```
✅ Strapi server started successfully
✅ No module not found errors
✅ Database connected
✅ Email plugin ready
```

---

**Commit deployed:** c3b7996  
**Date:** 2025-12-03  
**Status:** ✅ READY TO DEPLOY

Now run on production server and let me know if it works! 🚀

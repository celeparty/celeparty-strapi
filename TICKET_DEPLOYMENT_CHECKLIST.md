# Ticket Management System - Deployment Checklist

## Pre-Deployment ✅

### 1. Code Review
- [ ] Review `ticket-management.js` controller logic
- [ ] Review `ticket-management.js` service logic
- [ ] Check all content-type schemas for correctness
- [ ] Verify all route definitions
- [ ] Check error handling in all endpoints
- [ ] Verify authorization checks present

### 2. Environment Setup
- [ ] `.env` file configured with:
  - [ ] DATABASE credentials
  - [ ] SMTP credentials (email)
  - [ ] JWT_SECRET set
  - [ ] TICKET_ENCRYPTION_KEY set (32+ chars)
- [ ] All required npm packages installed:
  - [ ] `qrcode` - for QR generation
  - [ ] `@strapi/provider-email-nodemailer` - for email
  - [ ] `crypto` - built-in Node.js module

### 3. Database Preparation
- [ ] MySQL server running
- [ ] Database `celeparty` exists
- [ ] Database user has CREATE/ALTER permissions
- [ ] Backup of existing database taken (if migrating)

### 4. Dependency Verification
```bash
npm list qrcode
npm list @strapi/plugin-upload
npm list @strapi/plugin-content-type-builder
```

---

## Local Testing (Development) 🧪

### 1. Content-Type Creation
```bash
cd celeparty-strapi
npm run develop
```

In Strapi Admin UI:
- [ ] Navigate to Content-Types Builder
- [ ] Verify `ticket-detail` exists
- [ ] Verify `ticket-verification` exists
- [ ] Verify `ticket-send-history` exists
- [ ] Verify `ticket` has `ticket_details` relation
- [ ] All fields match schema definitions

### 2. API Routes Registration
In browser console or API client:
```bash
# Check route registration
GET http://localhost:1337/api/documentation

# Look for these routes:
✓ /api/tickets/summary
✓ /api/tickets/{id}/details
✓ /api/tickets/scan
✓ /api/tickets/{id}/verify
✓ /api/tickets/{id}/verification-history
✓ /api/tickets/send-invitation
✓ /api/tickets/send-history
```

### 3. Authentication Test
```bash
curl -X POST 'http://localhost:1337/api/auth/local' \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"vendor@example.com","password":"password"}'
```

- [ ] Receives JWT token
- [ ] Token is valid (can be decoded at jwt.io)

### 4. Endpoint Testing
Follow `TICKET_BACKEND_API_TESTING.md`:

```bash
# Test each endpoint sequentially:
1. GET /api/tickets/summary
   ✓ Returns array of tickets with stats
   ✓ No errors in Strapi logs

2. GET /api/tickets/:ticketId/details
   ✓ Returns paginated ticket details
   ✓ Filters work correctly
   ✓ Sort works correctly

3. POST /api/tickets/scan
   ✓ Finds ticket by token
   ✓ Finds ticket by code
   ✓ Returns ticket info

4. POST /api/tickets/:id/verify
   ✓ Updates ticket status
   ✓ Creates verification log
   ✓ Returns success message

5. GET /api/tickets/:id/verification-history
   ✓ Returns verification logs
   ✓ Pagination works
   ✓ Most recent first

6. POST /api/tickets/send-invitation
   ✓ Creates bypass tickets
   ✓ Sends emails
   ✓ Returns created tickets with QR codes
   ✓ Creates send history record

7. GET /api/tickets/send-history
   ✓ Returns send history
   ✓ Can filter by ticket
   ✓ Pagination works
```

### 5. Frontend Integration Test
```bash
cd celeparty-fe
npm run dev
```

Navigate to Vendor Dashboard → Tickets:
- [ ] Dashboard tab loads
- [ ] Displays summary correctly
- [ ] Details tab shows tickets
- [ ] Filters/sorting work
- [ ] Scan tab loads (camera permission)
- [ ] Send tab loads with forms
- [ ] Export buttons work

### 6. Email Delivery Test
```bash
# Send test invitation
POST /api/tickets/send-invitation
Body: {
  "ticketId": "1",
  "recipients": [
    {"name": "Test", "email": "test@example.com", "phone": "+62..."}
  ]
}
```

- [ ] No errors in Strapi logs
- [ ] Response includes success count
- [ ] Email received in inbox
- [ ] Email has QR code
- [ ] QR code scans correctly

### 7. QR Code Generation Test
```bash
# Check generated QR code
POST /api/tickets/send-invitation response.tickets[0].qr_code
```

- [ ] QR code is base64 PNG
- [ ] Image displays correctly
- [ ] Can be decoded to unique_token
- [ ] Links to correct ticket

---

## Staging Deployment 🚀

### 1. Build & Package
```bash
cd celeparty-strapi
npm run build
```
- [ ] Build completes without errors
- [ ] Build directory created
- [ ] dist/ folder contains compiled code

### 2. Environment Configuration
```env
# .env.production
NODE_ENV=production
DATABASE_CLIENT=mysql
DATABASE_HOST=db.staging.example.com
DATABASE_PORT=3306
DATABASE_NAME=celeparty_staging
DATABASE_USERNAME=celeparty_user
DATABASE_PASSWORD=STRONG_PASSWORD_HERE

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=staging@celeparty.com
SMTP_PASSWORD=APP_PASSWORD_HERE
SMTP_FROM=noreply@celeparty.com

JWT_SECRET=STAGING_JWT_SECRET_HERE
TICKET_ENCRYPTION_KEY=STAGING_ENCRYPTION_KEY_32_CHARS_MIN

API_URL=https://staging-api.celeparty.com
APP_URL=https://staging.celeparty.com

LOG_LEVEL=info
```

### 3. Database Setup
```bash
# Connect to staging database
mysql -h db.staging.example.com -u celeparty_user -p celeparty_staging

# Verify tables created by running:
SHOW TABLES LIKE 'ticket%';

# Should see:
✓ tickets
✓ ticket_details
✓ ticket_verifications
✓ ticket_send_histories
```

### 4. Deploy to Staging
```bash
# Option 1: Docker
docker build -t celeparty-strapi:latest .
docker run -d -p 1337:1337 \
  --env-file .env.production \
  celeparty-strapi:latest

# Option 2: PM2
pm2 start npm --name "strapi-staging" -- start

# Option 3: Manual
npm run develop (watch mode for testing)
npm start (production)
```

### 5. Staging Verification
```bash
# Health check
curl https://staging-api.celeparty.com/api/health

# Admin access
https://staging-api.celeparty.com/admin

# API access (with staging auth)
curl -X GET 'https://staging-api.celeparty.com/api/tickets/summary' \
  -H 'Authorization: Bearer STAGING_JWT_TOKEN'
```

### 6. Staging Testing
- [ ] Run full test suite from `TICKET_BACKEND_API_TESTING.md`
- [ ] Test with staging database
- [ ] Test with staging email account
- [ ] Verify QR codes work
- [ ] Verify email delivery
- [ ] Test with multiple users
- [ ] Load testing (optional):
  ```bash
  ab -c 10 -n 100 'https://staging-api.celeparty.com/api/tickets/summary'
  ```

### 7. Staging Frontend Testing
```bash
cd celeparty-fe
npm run build
# Deploy to staging frontend environment
```
- [ ] Frontend connects to staging API
- [ ] All dashboard features work
- [ ] Test with real staging data
- [ ] Email invitations work end-to-end
- [ ] QR scanning works
- [ ] Verification works

---

## Production Deployment 🌍

### 1. Pre-Production Backup
```bash
# Backup production database
mysqldump -h db.production.com -u celeparty_user -p celeparty \
  > backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
mysql -h db.production.com -u celeparty_user -p < backup_*.sql
```

### 2. Production Configuration
```env
# .env.production
NODE_ENV=production
DATABASE_CLIENT=mysql
DATABASE_HOST=db.production.com
DATABASE_PORT=3306
DATABASE_NAME=celeparty
DATABASE_USERNAME=celeparty_prod_user
DATABASE_PASSWORD=VERY_STRONG_PASSWORD_HERE

SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USERNAME=apikey
SMTP_PASSWORD=SG.YOUR_SENDGRID_KEY
SMTP_FROM=noreply@celeparty.com

JWT_SECRET=PRODUCTION_JWT_SECRET_VERY_STRONG
TICKET_ENCRYPTION_KEY=PRODUCTION_ENCRYPTION_KEY_32_CHARS_MIN

API_URL=https://api.celeparty.com
APP_URL=https://app.celeparty.com

LOG_LEVEL=warn
SENTRY_DSN=your-sentry-dsn-for-error-tracking
```

### 3. Database Migration
```bash
# (If migrating from old system)
mysql -h db.production.com -u root -p celeparty < migration_script.sql
```

### 4. Deploy to Production
```bash
# Build production image
docker build --build-arg NODE_ENV=production \
  -t celeparty-strapi:v1.0.0 .

# Tag for registry
docker tag celeparty-strapi:v1.0.0 \
  registry.example.com/celeparty-strapi:v1.0.0

# Push to registry
docker push registry.example.com/celeparty-strapi:v1.0.0

# Deploy using Kubernetes/Docker Compose/PM2
docker-compose -f docker-compose.prod.yml up -d
# OR
kubectl apply -f strapi-deployment.yaml
# OR
pm2 start npm --name "strapi-prod" -- start
```

### 5. Production Verification
```bash
# Health check
curl https://api.celeparty.com/api/health

# API accessible
curl -X GET 'https://api.celeparty.com/api/tickets/summary' \
  -H 'Authorization: Bearer PROD_JWT_TOKEN'

# Database connected
# (Check admin panel or logs)

# Email working
# (Monitor SMTP logs or test send)
```

### 6. Post-Deployment
- [ ] Monitor error logs
- [ ] Monitor performance metrics
- [ ] Check database query times
- [ ] Verify email delivery rate
- [ ] Monitor API response times
- [ ] Check disk space usage
- [ ] Verify backups running

### 7. Production Testing
- [ ] Create test ticket
- [ ] Send test invitation
- [ ] Verify email received
- [ ] Scan QR code
- [ ] Verify ticket
- [ ] Check history
- [ ] Test with real users

---

## Rollback Plan 🔄

### If Issues Occur

**Option 1: Immediate Rollback**
```bash
# Stop current deployment
docker stop strapi-prod
# OR
pm2 stop strapi-prod

# Restore from previous version
docker run -d -p 1337:1337 \
  registry.example.com/celeparty-strapi:v0.9.0

# Verify it works
curl https://api.celeparty.com/api/health
```

**Option 2: Database Rollback**
```bash
# Stop application
# Restore from backup
mysql -h db.production.com -u root -p celeparty < backup_latest.sql
# Restart application
```

**Option 3: Partial Rollback**
- Keep infrastructure running
- Update `.env` to point to previous API version
- Restart frontend to use old API endpoint

---

## Monitoring & Maintenance 📊

### Daily Checks
- [ ] API response times normal
- [ ] Error rates acceptable (<0.1%)
- [ ] Database query performance good
- [ ] Email delivery rates high (>95%)
- [ ] No security alerts

### Weekly Checks
- [ ] Database size growing normally
- [ ] Backup jobs completing
- [ ] Log files not too large
- [ ] User feedback positive

### Monthly Tasks
- [ ] Database optimization (ANALYZE TABLE)
- [ ] Review security logs
- [ ] Update dependencies
- [ ] Performance analysis
- [ ] Capacity planning

### Alerting Setup (Recommended)
```
Error Rate > 1% → Alert team
Response Time > 1s → Alert team
Database Connection Pool > 80% → Alert team
Email Failure Rate > 5% → Alert team
Disk Space < 10% → Alert team
```

---

## Performance Optimization 🚀

### Database Optimization
```sql
-- Create recommended indexes
ALTER TABLE ticket_details 
  ADD INDEX idx_ticket_code (ticket_code),
  ADD INDEX idx_unique_token (unique_token),
  ADD INDEX idx_ticket_id (ticket),
  ADD INDEX idx_verification_status (verification_status),
  ADD INDEX idx_payment_status (payment_status);

ALTER TABLE ticket_verifications
  ADD INDEX idx_ticket_detail (ticket_detail),
  ADD INDEX idx_verified_at (verified_at),
  ADD INDEX idx_verified_by (verified_by);

ALTER TABLE ticket_send_histories
  ADD INDEX idx_sent_by (sent_by),
  ADD INDEX idx_sent_at (sent_at),
  ADD INDEX idx_ticket (ticket);

-- Analyze tables
ANALYZE TABLE ticket_details;
ANALYZE TABLE ticket_verifications;
ANALYZE TABLE ticket_send_histories;
```

### Caching Strategy
```javascript
// Add Redis caching for frequently accessed data
const cacheTTL = {
  summary: 300,        // 5 minutes
  details: 600,        // 10 minutes
  verificationHistory: 600  // 10 minutes
};

// Invalidate cache on writes
// (Already implemented in controllers)
```

### Load Balancing (Optional)
- Deploy multiple Strapi instances
- Use HAProxy/Nginx for load balancing
- Use Redis for session sharing
- Use centralized database

---

## Security Verification ✅

### Before Production
- [ ] All API endpoints require authentication
- [ ] Authorization checks on all data access
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (using ORM)
- [ ] XSS prevention (JSON responses)
- [ ] CSRF tokens if needed
- [ ] Rate limiting implemented
- [ ] HTTPS enabled
- [ ] JWT secrets strong and unique
- [ ] Database credentials not in code
- [ ] Error messages don't leak info
- [ ] Audit logging enabled
- [ ] File upload restrictions (if applicable)
- [ ] CORS configured correctly

---

## Documentation Handoff 📚

### Provide to Team
- [ ] `TICKET_MANAGEMENT_BACKEND.md` - Implementation guide
- [ ] `TICKET_BACKEND_API_TESTING.md` - Testing procedures
- [ ] `TICKET_MANAGEMENT_IMPLEMENTATION_SUMMARY.md` - Overview
- [ ] Database schema SQL file
- [ ] Postman collection export
- [ ] Environment configuration template
- [ ] Deployment scripts
- [ ] Monitoring setup guide
- [ ] Troubleshooting guide

### Training
- [ ] Team reviews documentation
- [ ] Live demo of features
- [ ] Q&A session
- [ ] Test environment access
- [ ] Emergency contact list

---

## Success Criteria ✅

### Deployment Successful If:
- ✅ All 7 endpoints responding
- ✅ Summary shows correct data
- ✅ Details filterable/sortable
- ✅ QR codes generating
- ✅ Verification logging
- ✅ Emails sending
- ✅ Authorization working
- ✅ No errors in logs
- ✅ Response times < 500ms
- ✅ Database stable
- ✅ Frontend loading correctly
- ✅ End-to-end workflow working
- ✅ Users can use system

### Performance Targets
- API response time: < 500ms
- Email delivery: 5-30 seconds
- Database query: < 100ms
- Frontend load: < 2 seconds
- Uptime: > 99.5%

---

## Troubleshooting Guide 🔧

### Issue: Endpoints returning 404
**Check:**
- [ ] Routes file is loaded
- [ ] Route paths correct
- [ ] Controllers file exists
- [ ] Handler names match
- [ ] Strapi restarted after file changes

### Issue: Email not sending
**Check:**
- [ ] SMTP credentials correct
- [ ] Port 587 not blocked
- [ ] Email provider account active
- [ ] Rate limits not exceeded
- [ ] Check Strapi email logs

### Issue: QR codes not displaying
**Check:**
- [ ] QRCode package installed
- [ ] Unique token generated
- [ ] Base64 encoding correct
- [ ] Browser supports base64 images

### Issue: Database connection error
**Check:**
- [ ] MySQL server running
- [ ] Database name correct
- [ ] User credentials correct
- [ ] Host accessible
- [ ] Port not blocked

### Issue: Authorization failing
**Check:**
- [ ] JWT token valid
- [ ] Token not expired
- [ ] User exists in database
- [ ] User relationship set correctly

---

## Sign-Off

- [ ] Backend Developer: _________________ Date: _______
- [ ] Frontend Developer: _________________ Date: _______
- [ ] QA Tester: _________________________ Date: _______
- [ ] DevOps/Infrastructure: ______________ Date: _______
- [ ] Product Manager: ____________________ Date: _______

---

**Deployment Date:** ________________  
**Deployed To:** Production / Staging / Testing  
**Deployment Duration:** ________________  
**Issues Encountered:** [ ] None [ ] Minor [ ] Major  
**Status:** ✅ Successful [ ] Partial [ ] Rolled Back  

---

**Last Updated:** January 15, 2024  
**Version:** 1.0  
**Next Review:** After production deployment

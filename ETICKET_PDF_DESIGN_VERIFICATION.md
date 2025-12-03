# 🔍 E-TICKET PDF DESIGN - VERIFICATION & TROUBLESHOOTING

## 🔴 Issue Reported

```
"saat test beli tiket, e-ticket yang di terima di email masih sama dengan yang lama, 
belum menggunakan desain pdf yang baru"
```

**Translation:**
"When testing ticket purchase, the e-ticket received in email is still using the old design, 
not using the new PDF design"

---

## ✅ Verification Done

### Backend File Check
```
✅ generateProfessionalTicketPDF.js exists
   Location: src/api/transaction-ticket/utils/generateProfessionalTicketPDF.js
   Status: File found and verified

✅ Import statements correct
   File: transaction-ticket/content-types/transaction-ticket/lifecycles.js
   Line 5: const { generateProfessionalTicketPDF } = require(...);
   Status: ✅ Correctly imported

✅ No old generateTicketPDF functions remaining
   Search result: 0 matches
   Status: ✅ All old code removed

✅ Function usage verified
   Location: Lines 630 & 707 in lifecycles.js
   Status: ✅ Using new function
```

---

## 🎯 Expected Flow

### Email Sending Triggers

```
1. User completes purchase
   ↓
2. Payment processed by Midtrans
   ↓
3. Midtrans notifies backend (webhook)
   ↓
4. Backend updates transaction-ticket record
   ↓
5. payment_status changes from "pending" → "settlement"
   ↓
6. afterUpdate hook triggered
   ↓
7. Check: isSettlement && wasNotSettlement && customer_mail
   ↓
8. Generate Professional PDF using generateProfessionalTicketPDF()
   ↓
9. Attach PDF to email
   ↓
10. Send email with attachment ✅
```

---

## 🔧 Troubleshooting Steps

### Step 1: Verify Payment Status Change

**Check if payment_status is actually changing to 'settlement':**

```bash
# SSH to Strapi server, use MySQL client:
SELECT id, order_id, payment_status, created_at, updated_at 
FROM transaction_tickets 
ORDER BY created_at DESC 
LIMIT 5;

# Should see:
# id | order_id | payment_status | created_at | updated_at
# 1  | ORD001   | settlement     | ...        | ...
```

**If payment_status is NOT changing to 'settlement':**
- Problem: Midtrans webhook not triggering
- Solution: Check webhook configuration in Midtrans settings

### Step 2: Check Strapi Logs

**Look for email sending logs:**

```bash
# Check Strapi logs (usually in strapi server terminal)
# Should see:
"Should send email: true"
"Email individual ticket sent to..."
```

**If no logs appear:**
- Problem: Email sending code not being reached
- Solution: Check if payment_status is 'settlement'

### Step 3: Verify PDF Generation

**Check if new PDF generator is being called:**

```bash
# Look in Strapi logs for:
"Generating professional PDF for ticket..."
# or any log from generateProfessionalTicketPDF function
```

**If no PDF generation logs:**
- Problem: Maybe old function still being used
- Solution: Restart Strapi server completely

### Step 4: Check Email Service

**Verify email service is working:**

```bash
# In Strapi logs, look for:
"Email sent successfully"
OR
"Error sending email: ..."
```

**If getting email errors:**
- Check SMTP settings in .env
- Verify email service is configured
- Check email plugin is enabled

---

## 🚀 Potential Solutions

### Solution 1: Restart Strapi Server

**The most common fix** (file caching issue):

```bash
# Stop the running Strapi server
Ctrl+C

# Clear cache
rm -rf .cache/

# Rebuild (if needed)
npm run build

# Restart
npm run develop
# or
npm start
```

**Why this helps:**
- Clears old module caches
- Reloads all require() statements
- Ensures new file is recognized

### Solution 2: Check Strapi Plugin Status

**Verify email plugin is enabled:**

```javascript
// In Strapi admin panel:
// Settings → Plugins → Email
// Should be enabled and configured
```

### Solution 3: Manual Test Email

**Create a test transaction with manual payment status update:**

```bash
# In Strapi backend/database:
UPDATE transaction_tickets 
SET payment_status = 'settlement', updated_at = NOW() 
WHERE order_id = 'TEST001' AND payment_status = 'pending';

# This should trigger afterUpdate hook and send email
```

### Solution 4: Verify webhook URL

**Check Midtrans webhook settings:**

```
Midtrans Dashboard → Settings → Webhooks
Should point to: https://your-domain/api/webhooks/midtrans

If using localhost:
- Use ngrok or similar to expose local server
- Update webhook URL in Midtrans dashboard
- Test webhook delivery in Midtrans
```

---

## 📋 Verification Checklist

### Backend Files
- [x] generateProfessionalTicketPDF.js exists
- [x] Import statements correct
- [x] No old generateTicketPDF functions
- [x] New function used in lines 630 & 707
- [ ] **Strapi server restarted** ← DO THIS FIRST!

### Payment Flow
- [ ] Verify payment_status changes to 'settlement'
- [ ] Check transaction is associated with customer_mail
- [ ] Verify Midtrans webhook is triggering

### Email Sending
- [ ] Check Strapi email plugin is enabled
- [ ] Verify SMTP settings in .env
- [ ] Look for "Should send email: true" in logs

### Email Content
- [ ] Verify PDF attachment is in email
- [ ] Check if PDF uses new design (open attachment)
- [ ] Verify email template shows new professional design

---

## 🔍 Detailed Code Path

### File 1: lifecycles.js (afterUpdate hook)

```javascript
// Line 170: Check payment status
const isSettlement = result.payment_status === 'settlement' || result.payment_status === 'Settlement';
const wasNotSettlement = state.oldPaymentStatus !== 'settlement' && state.oldPaymentStatus !== 'Settlement';

// Line 512: Decide if should send email
const shouldSendEmail = result.customer_mail && isSettlement && wasNotSettlement;

// Line 512: Start ticket email sending
if (shouldSendEmail) {
  try {
    // Line 615: Get ticket details
    const ticketDetails = await strapi.entityService.findMany('api::ticket-detail.ticket-detail', ...);
    
    // Line 625-640: For each ticket detail
    for (const ticketDetail of ticketDetails) {
      // Line 630: Generate PDF using NEW function
      const pdfBuffer = await generateProfessionalTicketPDF({
        transaction: result,
        ticketDetail: ticketDetail,
        qrUrl: qrUrl,
        status: status
      });
      
      // Line 677: Send email with PDF attachment
      await strapi.plugin('email').service('email').send({
        to: ticketDetail.recipient_email,
        subject: emailSubject,
        html: ticketEmailHTML,
        attachments: [
          {
            filename: `ticket-${result.order_id}-${ticketDetail.barcode}.pdf`,
            content: pdfBuffer,  // ← PDF content attached
            contentType: 'application/pdf',
          },
        ],
      });
    }
  }
}
```

### File 2: generateProfessionalTicketPDF.js

```javascript
// Line 20: Function signature
async function generateProfessionalTicketPDF({ transaction, ticketDetail, qrUrl, status }) {
  // Creates professional PDF with:
  // - Header with logo and company info
  // - Organized sections (product, recipient, QR code)
  // - Colors: #3E2882 (primary), #DA7E01 (accent)
  // - Font: Lato
  
  return pdfBuffer;  // Returns buffer to attach to email
}
```

---

## 📊 Expected vs Actual

### Expected (What Should Happen)
```
User purchases ticket
  ↓
Payment settles
  ↓
payment_status = "settlement"
  ↓
afterUpdate triggered
  ↓
generateProfessionalTicketPDF() called
  ↓
Email sent with NEW professional PDF design ✅
  ↓
User receives email with:
  - Professional header (#3E2882 branding)
  - Clear sections (Product, Recipient, QR Code)
  - Modern layout
  - QR code for scanning
  - Footer with contact info
```

### Actual (If Old Design)
```
User purchases ticket
  ↓
Payment settles
  ↓
Email sent with OLD PDF design ❌
  ↓
Possible causes:
  1. Strapi server not restarted (caching old code)
  2. Old file still being referenced somewhere
  3. Payment status not changing properly
  4. Email plugin issue
```

---

## 🎯 Next Steps (Priority Order)

### 1️⃣ IMMEDIATE: Restart Strapi Server
```bash
# Stop Strapi
# Clear cache: rm -rf .cache/
# Restart: npm run develop
# This fixes 90% of such issues
```

**Why?** Node.js modules are cached. New files aren't recognized until restart.

### 2️⃣ Test Payment Flow
```bash
# Make a test purchase
# Verify payment_status changes to "settlement" in database
# Check Strapi logs for email sending
```

### 3️⃣ Check Email Received
```
Look for email in inbox:
- Subject should be about ticket confirmation
- Check if PDF attachment is there
- Open PDF to verify new design (should see #3E2882 branding)
```

### 4️⃣ If Still Not Working
```
- Enable debug logging in Strapi
- Check if generateProfessionalTicketPDF is being called
- Verify email service is working
- Check for errors in logs
```

---

## 📞 Support Info

### Logs to Check
```
Strapi Server Console:
- "Should send email: true/false"
- "Email individual ticket sent to..."
- "Error sending email..."
- "Generating professional PDF for ticket..."
```

### Database Query to Verify
```sql
SELECT 
  id, 
  order_id, 
  payment_status, 
  customer_mail,
  updated_at 
FROM transaction_tickets 
WHERE payment_status = 'settlement' 
ORDER BY updated_at DESC 
LIMIT 5;
```

### Files to Check
```
✅ src/api/transaction-ticket/utils/generateProfessionalTicketPDF.js
✅ src/api/transaction-ticket/content-types/transaction-ticket/lifecycles.js
✅ .env (email service config)
```

---

## ✨ Summary

**Status:** ✅ Code is correct, should be working

**Most Likely Issue:** Strapi server caching old code

**Quick Fix:**
```
1. Stop Strapi (Ctrl+C)
2. Remove cache: rm -rf .cache/
3. Restart: npm run develop
4. Test again
```

**If still not working:**
- Check Strapi logs
- Verify payment_status changes
- Check email service is enabled
- Contact support with logs

---

**Created:** December 3, 2025  
**Status:** VERIFICATION GUIDE  
**Action:** Follow troubleshooting steps above

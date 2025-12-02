# ✅ TICKET EMAIL INTEGRATION - QUICK CHECKLIST

## 🎯 OBJECTIVE
Membuat email yang dikirim saat transaksi berhasil menggunakan desain ticket template profesional terbaru.

---

## 📋 TO-DO LIST

### Phase 1: Preparation (5 min)
- [ ] Read `TICKET_EMAIL_INTEGRATION_GUIDE.md` (di folder celeparty-strapi)
- [ ] Verify file exists: `d:\laragon\www\celeparty-strapi\src\api\transaction-ticket\utils\generateProfessionalTicketPDF.js`
- [ ] Check current lifecycles.js location

### Phase 2: Implementation (20 min)

#### Step 1: Update lifecycles.js - Add Import
- [ ] Open: `d:\laragon\www\celeparty-strapi\src\api\transaction-ticket\content-types\transaction-ticket\lifecycles.js`
- [ ] Find line ~1-5 (imports section)
- [ ] Add: `const { generateProfessionalTicketPDF } = require('../../utils/generateProfessionalTicketPDF');`
- [ ] Verify import is added correctly

#### Step 2: Replace Function Calls (Multiple Locations)
- [ ] Find all `generateTicketPDF(` calls in lifecycles.js
- [ ] Replace with `generateProfessionalTicketPDF(`
- [ ] Update parameters to match new function signature:
  ```javascript
  // Old: generateTicketPDF({ url, transaction, status, recipientName, recipientEmail, barcode })
  // New: generateProfessionalTicketPDF({ transaction, ticketDetail, qrUrl, status })
  ```
- [ ] Verify at least 2-3 locations updated

#### Step 3: Test Local
- [ ] Start Strapi development server
- [ ] Create test transaction with settlement status
- [ ] Check logs for any errors
- [ ] Verify email is sent

### Phase 3: Verification (10 min)
- [ ] ✅ Email received with PDF attachment
- [ ] ✅ PDF has professional design
- [ ] ✅ Header shows logo, company name, slogan in correct colors
- [ ] ✅ Body shows ticket info and recipient info
- [ ] ✅ QR code appears centered
- [ ] ✅ Footer has primary line, date, contact info
- [ ] ✅ Colors match: Primary #3E2882, Accent #DA7E01

### Phase 4: Deployment (5 min)
- [ ] Commit changes to Git
- [ ] Push to development/staging
- [ ] Test on staging environment
- [ ] Monitor email delivery
- [ ] Deploy to production

---

## 🔧 EXACT CODE CHANGES

### File: lifecycles.js

**Line ~1-5: ADD IMPORT**
```javascript
// Add this line after other requires
const { generateProfessionalTicketPDF } = require('../../utils/generateProfessionalTicketPDF');
```

**Line ~700-715: REPLACE CALL #1**

BEFORE:
```javascript
const pdfBuffer = await generateTicketPDF({
  url: qrUrl,
  transaction: result,
  status,
  recipientName: ticketDetail.recipient_name,
  recipientEmail: ticketDetail.recipient_email,
  barcode: ticketDetail.barcode
});
```

AFTER:
```javascript
const pdfBuffer = await generateProfessionalTicketPDF({
  transaction: result,
  ticketDetail: ticketDetail,
  qrUrl: qrUrl,
  status: status
});
```

**Line ~780-795: REPLACE CALL #2**

BEFORE:
```javascript
const pdfBuffer = await generateTicketPDF({
  url: qrUrl,
  transaction: result,
  status,
  recipientName: result.customer_name,
  recipientEmail: result.customer_mail,
  barcode: result.order_id
});
```

AFTER:
```javascript
const pdfBuffer = await generateProfessionalTicketPDF({
  transaction: result,
  ticketDetail: {
    recipient_name: result.customer_name,
    recipient_email: result.customer_mail,
    barcode: result.order_id,
    whatsapp_number: result.telp,
    identity_type: 'KTP',
    identity_number: '-'
  },
  qrUrl: qrUrl,
  status: status
});
```

---

## ⏱️ TIME ESTIMATE

| Task | Duration | Status |
|------|----------|--------|
| Read Documentation | 10 min | ⏳ Ready |
| Update Imports | 5 min | ⏳ Ready |
| Replace Function Calls | 10 min | ⏳ Ready |
| Test & Verify | 15 min | ⏳ Ready |
| Deploy | 10 min | ⏳ Ready |
| **TOTAL** | **~50 min** | ✅ Ready |

---

## 📞 SUPPORT

**Questions?**
- Check: `TICKET_EMAIL_INTEGRATION_GUIDE.md`
- Check: `TICKET_TEMPLATE_DOCUMENTATION.md` (frontend)
- Check: `generateProfessionalTicketPDF.js` comments

**Issues?**
- Verify file paths are correct
- Check Node.js version (should be >= 14)
- Verify PDFKit and QRCode packages are installed
- Check Strapi logs for errors

---

## ✨ SUCCESS INDICATORS

When done correctly, you should see:

1. **No Build Errors** ✅
2. **No Runtime Errors** ✅
3. **Email Received** ✅
4. **PDF Attachment Present** ✅
5. **Professional Design** ✅
6. **All Colors Correct** ✅
7. **All Info Displayed** ✅

---

## 🎊 YOU'RE READY!

All files prepared. Just need to:
1. Update import
2. Replace function calls
3. Test
4. Deploy

**Let's go! 🚀**

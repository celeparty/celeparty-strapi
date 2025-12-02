/**
 * ============================================
 * PATCH GUIDE: Update lifecycles.js
 * ============================================
 * 
 * This file shows EXACT changes needed
 * Copy-paste friendly code sections
 * 
 * Date: December 3, 2025
 */

// ========================================
// STEP 1: ADD THIS IMPORT AT THE TOP
// ========================================

// File: d:\laragon\www\celeparty-strapi\src\api\transaction-ticket\content-types\transaction-ticket\lifecycles.js
// Location: Lines 1-10 (with other imports)

// ADD THIS LINE:
const { generateProfessionalTicketPDF } = require('../../utils/generateProfessionalTicketPDF');


// ========================================
// STEP 2: REPLACE FUNCTION CALL #1
// ========================================

// Location: Around line 700-715
// Find this block:

/*
              const baseUrl = process.env.FRONT_URL + '/qr';
              const params = new URLSearchParams({
                barcode: ticketDetail.barcode,
                event_date: result.event_date,
                customer_name: result.customer_name,
                email: result.customer_mail,
                event_type: result.event_type,
              }).toString();
              const qrUrl = `${baseUrl}?${params}`;

              const status = getTicketStatus(result.event_date);
              const pdfBuffer = await generateTicketPDF({
                url: qrUrl,
                transaction: result,
                status,
                recipientName: ticketDetail.recipient_name,
                recipientEmail: ticketDetail.recipient_email,
                barcode: ticketDetail.barcode
              });
*/

// REPLACE WITH THIS:

/*
              const baseUrl = process.env.FRONT_URL + '/qr';
              const params = new URLSearchParams({
                barcode: ticketDetail.barcode,
                event_date: result.event_date,
                customer_name: result.customer_name,
                email: result.customer_mail,
                event_type: result.event_type,
              }).toString();
              const qrUrl = `${baseUrl}?${params}`;

              const status = getTicketStatus(result.event_date);
              const pdfBuffer = await generateProfessionalTicketPDF({
                transaction: result,
                ticketDetail: ticketDetail,
                qrUrl: qrUrl,
                status: status
              });
*/


// ========================================
// STEP 3: REPLACE FUNCTION CALL #2
// ========================================

// Location: Around line 780-795
// Find this block:

/*
          const baseUrl = process.env.FRONT_URL + '/qr';
          const params = new URLSearchParams({
            order_id: result.order_id,
            event_date: result.event_date,
            customer_name: result.customer_name,
            email: result.customer_mail,
            event_type: result.event_type,
          }).toString();
          const qrUrl = `${baseUrl}?${params}`;

          const status = getTicketStatus(result.event_date);
          const pdfBuffer = await generateTicketPDF({
            url: qrUrl,
            transaction: result,
            status,
            recipientName: result.customer_name,
            recipientEmail: result.customer_mail,
            barcode: result.order_id
          });
*/

// REPLACE WITH THIS:

/*
          const baseUrl = process.env.FRONT_URL + '/qr';
          const params = new URLSearchParams({
            order_id: result.order_id,
            event_date: result.event_date,
            customer_name: result.customer_name,
            email: result.customer_mail,
            event_type: result.event_type,
          }).toString();
          const qrUrl = `${baseUrl}?${params}`;

          const status = getTicketStatus(result.event_date);
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
*/


// ========================================
// STEP 4: VERIFICATION
// ========================================

// After making changes, verify:
// 1. No syntax errors in the file
// 2. Import line added at top
// 3. Both generateTicketPDF calls replaced
// 4. File saved
// 5. Strapi restarts without errors


// ========================================
// OLD FUNCTION - Can be removed or kept
// ========================================

// Optional: Remove this function if you don't need it
// Location: Around line 133-205

/*
async function generateTicketPDF({ url, transaction, status, recipientName, recipientEmail, barcode }) {
  // ... old implementation
  // You can DELETE this entire function after confirming
  // the new generateProfessionalTicketPDF is working
}
*/


// ========================================
// TESTING CHECKLIST
// ========================================

/*
After implementing, test with:

1. Start Strapi:
   npm run develop

2. Create test transaction:
   - Go to admin panel
   - Create transaction with status "pending"
   
3. Update to settlement:
   - Change status to "settlement"
   - Should trigger email
   - Check logs for errors

4. Verify email:
   - Check inbox for ticket email
   - Download PDF attachment
   - Check design elements:
     ✓ Header with logo
     ✓ Company name in primary color
     ✓ Slogan in accent color
     ✓ Ticket info section
     ✓ Recipient info section
     ✓ QR code centered
     ✓ Status badge
     ✓ Footer with date and contact

5. If issues:
   - Check browser console for errors
   - Check Strapi logs
   - Verify file paths
   - Verify packages installed
*/


// ========================================
// QUICK DIFF REFERENCE
// ========================================

// What changed:
// 
// OLD: const pdfBuffer = await generateTicketPDF({
//   url: qrUrl,
//   transaction: result,
//   status,
//   recipientName: ...,
//   recipientEmail: ...,
//   barcode: ...
// });
//
// NEW: const pdfBuffer = await generateProfessionalTicketPDF({
//   transaction: result,
//   ticketDetail: { ... },
//   qrUrl: qrUrl,
//   status: status
// });
//
// Reason: New function signature is cleaner and uses object structure


// ========================================
// ROLLBACK INSTRUCTIONS (if needed)
// ========================================

/*
If you need to rollback to old version:

1. Replace import:
   FROM: const { generateProfessionalTicketPDF } = require('../../utils/...');
   TO:   // Remove this line

2. Replace function calls back to:
   generateTicketPDF({
     url: qrUrl,
     transaction: result,
     status,
     recipientName: ...,
     recipientEmail: ...,
     barcode: ...
   });

3. Save and restart Strapi

4. Test to confirm old version works
*/


// ========================================
// SUPPORT
// ========================================

/*
Documentation files available:
1. TICKET_EMAIL_INTEGRATION_GUIDE.md
   - Complete implementation guide
   
2. TICKET_EMAIL_IMPLEMENTATION_CHECKLIST.md
   - Step-by-step checklist
   
3. TICKET_DESIGN_BEFORE_AFTER.md
   - Visual design comparison
   
4. TICKET_DESIGN_IMPLEMENTATION.md
   - Overview and strategy
   
All files in: d:\laragon\www\celeparty-strapi\
*/


// ========================================
// END OF PATCH GUIDE
// ========================================

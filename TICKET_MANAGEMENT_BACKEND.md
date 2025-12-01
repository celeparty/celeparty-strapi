# Backend Ticket Management Implementation Guide

## Overview
Complete Strapi 5.4.1 backend implementation for Ticket Management system supporting the vendor dashboard with 3 tabs (Dashboard, Scan, Send).

## Content-Types Created/Modified

### 1. **ticket** (Extended)
**Location:** `src/api/ticket/content-types/ticket/schema.json`

**New Relations:**
- `ticket_details` (oneToMany) → Individual ticket records

**Fields:** [Existing fields preserved]
- title, category, variant, main_image, description
- event_date, waktu_event, lokasi_event, kota_event
- end_date, end_time, rate, sold_count, escrow, state
- + NEW: `ticket_details` relationship

### 2. **ticket-detail** (Created/Extended)
**Location:** `src/api/ticket-detail/content-types/ticket-detail/schema.json`

**Purpose:** Individual ticket records with QR codes and verification tracking

**Fields:**
```
ticket                    (manyToOne) → ticket
product                   (manyToOne) → product
variant                   (string) - Variant name/id
ticket_code              (string, unique) - Format: TK-YYYYMMDD-XXXX
unique_token             (string, unique) - Token for QR code generation
qr_code                  (text) - Base64 encoded QR image
qr_code_encrypted        (text) - Encrypted token for security
verification_status      (enum) - unused | verified | invalid | duplicate
payment_status           (enum) - pending | paid | refunded | cancelled
buyer_email              (email, required)
buyer_phone              (string, required)
buyer_name               (string, required)
verified_at              (datetime) - When verified
verified_by              (manyToOne) → user
notes                    (text) - Additional notes
is_bypass                (boolean) - True if sent without payment
bypass_created_by        (manyToOne) → user
bypass_created_at        (datetime)
```

**Legacy Fields (Backward Compatibility):**
- recipient_name, identity_type, identity_number
- whatsapp_number, recipient_email, barcode, status (marked deprecated)

### 3. **ticket-verification** (Created)
**Location:** `src/api/ticket-verification/content-types/ticket-verification/schema.json`

**Purpose:** Log of all ticket verification events for audit trail

**Fields:**
```
ticket_detail            (manyToOne) → ticket-detail
ticket_code             (string) - For quick reference
verification_type       (enum) - scanned | manual | bulk_verify
verified_by             (manyToOne) → user
verified_at             (datetime, required)
result                  (enum) - success | failed | duplicate | invalid
failure_reason          (string) - If failed
ip_address              (string) - Source IP
device_info             (text) - Browser/device info
notes                   (text) - Additional notes
```

### 4. **ticket-send-history** (Created)
**Location:** `src/api/ticket-send-history/content-types/ticket-send-history/schema.json`

**Purpose:** Track ticket invitation sending operations

**Fields:**
```
ticket                  (manyToOne) → ticket
product                 (manyToOne) → product
variant                 (string) - Product variant name
sent_by                 (manyToOne) → user
recipient_count         (integer) - Number of recipients
successful_count        (integer) - Successfully sent
failed_count            (integer) - Failed sends
recipients              (json) - Recipient objects array
message                 (text) - Message sent with tickets
sent_at                 (datetime, required)
email_template          (string) - Template used
status                  (enum) - pending | sent | partially_sent | failed
error_log               (text) - Error details if failed
```

---

## API Endpoints

### Base URL: `/api`

### 1. **Get Ticket Summary**
```
GET /api/tickets/summary
Auth: Required (Users-Permissions)

Response:
{
  success: true,
  data: [
    {
      id: "123",
      title: "Concert Ticket",
      totalSold: 150,
      totalTickets: 150,
      verifiedTickets: 45,
      paidTickets: 140,
      bypassTickets: 10,
      variants: {
        "VIP": { total: 50, verified: 20, paid: 45, bypass: 5, revenue: 0 },
        "Regular": { total: 100, verified: 25, paid: 95, bypass: 5, revenue: 0 }
      },
      createdAt: "2024-01-15T10:00:00Z"
    }
  ]
}
```

### 2. **Get Ticket Details (with filtering/sorting)**
```
GET /api/tickets/:ticketId/details
Auth: Required (Users-Permissions)

Query Parameters:
- page: number (default: 1)
- pageSize: number (default: 10)
- variantId: string (optional)
- search: string (searches name, email, phone, ticket_code)
- verificationStatus: unused | verified | invalid | duplicate
- paymentStatus: pending | paid | refunded | cancelled
- sortBy: ticket_code | buyer_name | verified_at | created_at (default: created_at)
- sortOrder: asc | desc (default: desc)

Response:
{
  success: true,
  data: [
    {
      id: "456",
      ticket_code: "TK-20240115-0001",
      unique_token: "abc123xyz...",
      verification_status: "unused",
      payment_status: "paid",
      buyer_name: "John Doe",
      buyer_email: "john@example.com",
      buyer_phone: "+62812345678",
      verified_at: null,
      is_bypass: false,
      created_at: "2024-01-15T10:00:00Z"
    }
  ],
  pagination: {
    page: 1,
    pageSize: 10,
    total: 150,
    pageCount: 15
  }
}
```

### 3. **Scan Ticket (QR Code)**
```
POST /api/tickets/scan
Auth: Required (Users-Permissions)

Body:
{
  encodedToken: "abc123xyz..." OR
  ticketCode: "TK-20240115-0001"
}

Response:
{
  success: true,
  data: {
    id: "456",
    ticket_code: "TK-20240115-0001",
    buyer_name: "John Doe",
    buyer_email: "john@example.com",
    verification_status: "unused",
    payment_status: "paid",
    verified_at: null,
    verified_by: null,
    ticket: {
      id: "123",
      title: "Concert Ticket"
    }
  }
}
```

### 4. **Verify Ticket**
```
POST /api/tickets/:ticketDetailId/verify
Auth: Required (Users-Permissions)

Body:
{
  verificationMode: "scanned" (scanned | manual | bulk_verify)
}

Response:
{
  success: true,
  message: "Ticket verified successfully",
  data: {
    id: "456",
    verification_status: "verified",
    verified_at: "2024-01-15T14:30:00Z",
    verified_by: "789"
  }
}
```

### 5. **Get Verification History**
```
GET /api/tickets/:ticketDetailId/verification-history
Auth: Required (Users-Permissions)

Query Parameters:
- page: number (default: 1)
- pageSize: number (default: 10)

Response:
{
  success: true,
  data: [
    {
      id: "hist1",
      ticket_code: "TK-20240115-0001",
      verification_type: "scanned",
      verified_by: { id: "789", username: "scanner1" },
      verified_at: "2024-01-15T14:30:00Z",
      result: "success",
      ip_address: "192.168.1.100",
      device_info: "Mozilla/5.0...",
      notes: null
    }
  ],
  pagination: {
    page: 1,
    pageSize: 10,
    total: 5,
    pageCount: 1
  }
}
```

### 6. **Send Ticket Invitation**
```
POST /api/tickets/send-invitation
Auth: Required (Users-Permissions)

Body:
{
  ticketId: "123",
  productId: "456",
  variantId: "VIP",
  recipients: [
    {
      name: "Jane Smith",
      email: "jane@example.com",
      phone: "+62812345678"
    },
    {
      name: "Bob Johnson",
      email: "bob@example.com",
      phone: "+62812345679"
    }
  ],
  message: "Optional message to include with invitation"
}

Response:
{
  success: true,
  message: "Invitations sent successfully to 2 recipients",
  data: {
    ticketsCreated: 2,
    successCount: 2,
    failedCount: 0,
    tickets: [
      {
        id: "new1",
        ticket_code: "TK-20240115-0002",
        unique_token: "xyz789abc...",
        qr_code: "data:image/png;base64,...",
        buyer_name: "Jane Smith",
        is_bypass: true
      },
      {
        id: "new2",
        ticket_code: "TK-20240115-0003",
        unique_token: "def456ghi...",
        qr_code: "data:image/png;base64,...",
        buyer_name: "Bob Johnson",
        is_bypass: true
      }
    ]
  }
}
```

### 7. **Get Send History**
```
GET /api/tickets/send-history
Auth: Required (Users-Permissions)

Query Parameters:
- page: number (default: 1)
- pageSize: number (default: 10)
- ticketId: string (optional - filter by ticket)

Response:
{
  success: true,
  data: [
    {
      id: "send1",
      ticket: { id: "123", title: "Concert Ticket" },
      product: { id: "456", title: "VIP Package" },
      variant: "VIP",
      recipient_count: 2,
      successful_count: 2,
      failed_count: 0,
      recipients: "[{...}, {...}]",
      message: "Please join us!",
      sent_at: "2024-01-15T15:00:00Z",
      status: "sent"
    }
  ],
  pagination: {
    page: 1,
    pageSize: 10,
    total: 5,
    pageCount: 1
  }
}
```

---

## File Structure

```
src/api/
├── ticket/
│   ├── content-types/
│   │   └── ticket/
│   │       └── schema.json (MODIFIED - added ticket_details relation)
│   ├── controllers/
│   │   ├── ticket.js (default)
│   │   └── ticket-management.js (NEW - custom endpoints)
│   ├── services/
│   │   ├── ticket.js (default)
│   │   └── ticket-management.js (NEW - utility functions)
│   ├── routes/
│   │   ├── ticket.js (default)
│   │   └── ticket-management.js (NEW - custom routes)
│
├── ticket-detail/ (NEW)
│   ├── content-types/
│   │   └── ticket-detail/
│   │       ├── schema.json (NEW)
│   │       └── lifecycles.js
│   ├── controllers/
│   │   └── ticket-detail.js (NEW)
│   ├── services/
│   │   └── ticket-detail.js (NEW)
│   └── routes/
│       └── ticket-detail.js (NEW)
│
├── ticket-verification/ (NEW)
│   ├── content-types/
│   │   └── ticket-verification/
│   │       └── schema.json (NEW)
│   ├── controllers/
│   │   └── ticket-verification.js (NEW)
│   ├── services/
│   │   └── ticket-verification.js (NEW)
│   └── routes/
│       └── ticket-verification.js (NEW)
│
└── ticket-send-history/ (NEW)
    ├── content-types/
    │   └── ticket-send-history/
    │       └── schema.json (NEW)
    ├── controllers/
    │   └── ticket-send-history.js (NEW)
    ├── services/
    │   └── ticket-send-history.js (NEW)
    └── routes/
        └── ticket-send-history.js (NEW)
```

---

## Key Features

### 1. **Ticket Code Generation**
- Format: `TK-YYYYMMDD-XXXX` (e.g., `TK-20240115-0001`)
- Unique per ticket
- Easy to read and reference

### 2. **QR Code Generation**
- Generated from unique_token
- Base64 encoded for storage/transmission
- Optional encryption for additional security
- 300x300px optimal size

### 3. **Unique Token System**
- 64-character hex string (32 bytes)
- Generated using crypto.randomBytes()
- Used for QR code content
- Optionally encrypted for token verification

### 4. **Email Invitations**
- HTML template with QR code
- Multi-language support (includes Indonesian)
- Tracks success/failure rate
- Stores recipient information for follow-up

### 5. **Verification Tracking**
- Comprehensive audit log
- Tracks: timestamp, user, device, IP, result
- Supports multiple verification methods (scanned, manual, bulk)
- Enables verification analytics

### 6. **Authorization**
- All endpoints require authentication
- Vendor can only access their own tickets
- Staff can verify tickets assigned to their scope
- Role-based access control ready

---

## Environment Variables Required

```env
# Database
DATABASE_CLIENT=mysql
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_NAME=celeparty
DATABASE_USERNAME=root
DATABASE_PASSWORD=

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@celeparty.com

# Ticket System
TICKET_ENCRYPTION_KEY=your-secret-key-min-32-chars-long

# JWT
JWT_SECRET=your-jwt-secret
JWT_EXPIRE=7d
```

---

## Installation Steps

### 1. **Database Migration**
The content-types are already defined. Run Strapi to auto-create tables:

```bash
npm run develop
```

Strapi will automatically:
- Create `ticket_details` table
- Create `ticket_verifications` table
- Create `ticket_send_histories` table
- Add `ticket_details` relation to `tickets` table

### 2. **Verify Routes**
After starting Strapi, check that routes are registered:

```bash
# These endpoints should be available at:
GET  /api/tickets/summary
GET  /api/tickets/:ticketId/details
POST /api/tickets/scan
POST /api/tickets/:ticketDetailId/verify
GET  /api/tickets/:ticketDetailId/verification-history
POST /api/tickets/send-invitation
GET  /api/tickets/send-history
```

### 3. **Test with Postman/cURL**
Example request:

```bash
curl -X GET 'http://localhost:1337/api/tickets/summary' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json'
```

---

## Frontend Integration

### API Endpoint Documentation
See `BACKEND_API_EXAMPLES.md` for complete integration examples with:
- Complete request/response payloads
- Error handling patterns
- JavaScript/TypeScript integration
- React Hook usage examples

### Frontend Components
Already created and ready to use:
- `TicketDashboard.tsx` - Main dashboard
- `TicketSummaryTable.tsx` - Summary display
- `TicketDetailPage.tsx` - Detailed list with filters
- `TicketScan.tsx` - QR code scanning
- `TicketSend.tsx` - Invitation sending

---

## Security Considerations

### 1. **Token Encryption**
- Optional encryption for tokens
- Prevents token theft from database
- Requires `TICKET_ENCRYPTION_KEY` environment variable

### 2. **Authorization Checks**
- All endpoints verify vendor ownership
- Multi-level permission checks
- Audit logging for all operations

### 3. **Input Validation**
- Email validation on recipients
- Phone number validation
- Payload size limits (via Strapi middleware)

### 4. **Rate Limiting**
- Recommended: Implement rate limiting in reverse proxy
- Prevent abuse of verification endpoints
- Track suspicious patterns

---

## Error Handling

### Common Error Codes

| Status | Error | Solution |
|--------|-------|----------|
| 400 | Invalid ticket ID | Check ticketId parameter |
| 401 | Not authenticated | Provide valid JWT token |
| 403 | Not authorized | Verify ticket ownership |
| 404 | Ticket not found | Check ticket exists |
| 422 | Validation error | Check required fields |
| 500 | Server error | Check server logs |

---

## Performance Optimization

### 1. **Database Indexing**
Recommended indexes to create:

```sql
-- On ticket_details
CREATE INDEX idx_ticket_code ON ticket_details(ticket_code);
CREATE INDEX idx_unique_token ON ticket_details(unique_token);
CREATE INDEX idx_ticket_id ON ticket_details(ticket);
CREATE INDEX idx_verification_status ON ticket_details(verification_status);

-- On ticket_verifications
CREATE INDEX idx_ticket_detail ON ticket_verifications(ticket_detail);
CREATE INDEX idx_verified_at ON ticket_verifications(verified_at);
CREATE INDEX idx_verified_by ON ticket_verifications(verified_by);

-- On ticket_send_histories
CREATE INDEX idx_sent_by ON ticket_send_histories(sent_by);
CREATE INDEX idx_sent_at ON ticket_send_histories(sent_at);
```

### 2. **Caching**
- Cache ticket summary for 5 minutes
- Cache verification history for 10 minutes
- Invalidate on verification/send operations

### 3. **Pagination**
- Default page size: 10
- Max page size: 100
- Avoid large result sets

---

## Testing

### 1. **Manual Testing Checklist**
- [ ] Create bypass tickets
- [ ] Send email invitations
- [ ] Verify tickets via QR code
- [ ] Check verification history
- [ ] Test filtering/sorting
- [ ] Test pagination
- [ ] Verify authorization

### 2. **Sample Test Data**
Use `BACKEND_API_EXAMPLES.md` for test scenarios

---

## Migration from Old System

If migrating from old ticket system:

1. **Backup existing data:**
   ```sql
   BACKUP DATABASE celeparty TO DISK = 'path/to/backup.bak';
   ```

2. **Map old data:**
   - Old `ticket_details.recipient_name` → New `ticket_details.buyer_name`
   - Old `ticket_details.recipient_email` → New `ticket_details.buyer_email`
   - Old `ticket_details.whatsapp_number` → New `ticket_details.buyer_phone`

3. **Generate missing fields:**
   - Generate `ticket_code` for existing tickets
   - Generate `unique_token` for existing tickets
   - Generate QR codes for existing tickets

Example migration script:
```javascript
// Migration helper
const migrationHelper = {
  generateMissingTokens: async (ticketDetailId) => {
    // Generate and update missing tokens
  },
  generateMissingQRCodes: async (ticketDetailId) => {
    // Generate and update missing QR codes
  }
};
```

---

## Support & Troubleshooting

### Issue: Email not sending
**Solution:** Check SMTP configuration in `.env` and verify email provider credentials

### Issue: QR code not generating
**Solution:** Ensure `qrcode` package is installed: `npm install qrcode`

### Issue: Authorization failing
**Solution:** Verify JWT token is valid and user relationship is set correctly

### Issue: Verification history not showing
**Solution:** Check that ticket-verification content-type is properly created

For more help, check Strapi documentation at https://docs.strapi.io/

---

## Next Steps

1. **Deploy to production:** Follow Strapi deployment guide
2. **Setup CI/CD:** Automate testing and deployment
3. **Monitor performance:** Setup APM (Application Performance Monitoring)
4. **Scale database:** Consider read replicas for large-scale operations
5. **Implement caching:** Redis for frequently accessed data

---

**Last Updated:** 2024-01-15  
**Status:** ✅ Complete - Ready for Testing

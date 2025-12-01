# Ticket Management Backend - API Testing Guide

## Quick Start Testing

### 1. Get Your JWT Token

First, authenticate to get a token:

```bash
curl -X POST 'http://localhost:1337/api/auth/local' \
  -H 'Content-Type: application/json' \
  -d '{
    "identifier": "vendor@example.com",
    "password": "password123"
  }'
```

**Response:**
```json
{
  "jwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "vendor",
    "email": "vendor@example.com",
    "provider": "local",
    "confirmed": true,
    "blocked": false,
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  }
}
```

Save the `jwt` token for all subsequent requests.

---

## API Endpoint Testing

### Endpoint 1: Get Ticket Summary

**Request:**
```bash
curl -X GET 'http://localhost:1337/api/tickets/summary' \
  -H 'Authorization: Bearer eyJhbGc...' \
  -H 'Content-Type: application/json'
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "title": "Concert 2024",
      "totalSold": 150,
      "totalTickets": 150,
      "verifiedTickets": 45,
      "paidTickets": 140,
      "bypassTickets": 10,
      "variants": {
        "VIP": {
          "total": 50,
          "verified": 20,
          "paid": 45,
          "bypass": 5,
          "revenue": 0
        },
        "Regular": {
          "total": 100,
          "verified": 25,
          "paid": 95,
          "bypass": 5,
          "revenue": 0
        }
      },
      "createdAt": "2024-01-15T10:00:00.000Z"
    }
  ]
}
```

**Test Cases:**
- ✅ With valid JWT token → Returns summary
- ❌ Without JWT token → 401 Unauthorized
- ❌ With invalid token → 401 Unauthorized

---

### Endpoint 2: Get Ticket Details

**Request (Basic):**
```bash
curl -X GET 'http://localhost:1337/api/tickets/1/details' \
  -H 'Authorization: Bearer eyJhbGc...' \
  -H 'Content-Type: application/json'
```

**Request (With Filtering & Pagination):**
```bash
curl -X GET 'http://localhost:1337/api/tickets/1/details?page=1&pageSize=5&search=john&verificationStatus=unused&sortBy=created_at&sortOrder=desc' \
  -H 'Authorization: Bearer eyJhbGc...' \
  -H 'Content-Type: application/json'
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "100",
      "ticket_code": "TK-20240115-0001",
      "unique_token": "abc123xyz789def456ghi789jkl...",
      "verification_status": "unused",
      "payment_status": "paid",
      "buyer_name": "John Doe",
      "buyer_email": "john@example.com",
      "buyer_phone": "+62812345678",
      "verified_at": null,
      "is_bypass": false,
      "created_at": "2024-01-15T10:00:00.000Z"
    },
    {
      "id": "101",
      "ticket_code": "TK-20240115-0002",
      "unique_token": "def456ghi789jkl012mno345pqr...",
      "verification_status": "verified",
      "payment_status": "paid",
      "buyer_name": "Jane Smith",
      "buyer_email": "jane@example.com",
      "buyer_phone": "+62812345679",
      "verified_at": "2024-01-15T14:30:00.000Z",
      "is_bypass": false,
      "created_at": "2024-01-15T11:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 5,
    "total": 150,
    "pageCount": 30
  }
}
```

**Test Cases:**
- ✅ Get first page → Returns 5 items
- ✅ Filter by search term → Only matching records
- ✅ Filter by status → Only matching status
- ✅ Sort ascending → Oldest first
- ✅ Sort descending → Newest first
- ❌ Non-owner ticket ID → 403 Forbidden
- ❌ Invalid ticket ID → 404 Not Found

---

### Endpoint 3: Scan Ticket (QR Code)

**Request (Scan by Token):**
```bash
curl -X POST 'http://localhost:1337/api/tickets/scan' \
  -H 'Authorization: Bearer eyJhbGc...' \
  -H 'Content-Type: application/json' \
  -d '{
    "encodedToken": "abc123xyz789def456ghi789jkl..."
  }'
```

**Request (Scan by Code):**
```bash
curl -X POST 'http://localhost:1337/api/tickets/scan' \
  -H 'Authorization: Bearer eyJhbGc...' \
  -H 'Content-Type: application/json' \
  -d '{
    "ticketCode": "TK-20240115-0001"
  }'
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "100",
    "ticket_code": "TK-20240115-0001",
    "buyer_name": "John Doe",
    "buyer_email": "john@example.com",
    "verification_status": "unused",
    "payment_status": "paid",
    "verified_at": null,
    "verified_by": null,
    "ticket": {
      "id": "1",
      "title": "Concert 2024"
    }
  }
}
```

**Error Response (400):**
```json
{
  "error": {
    "status": 400,
    "name": "BadRequest",
    "message": "Either encodedToken or ticketCode is required"
  }
}
```

**Test Cases:**
- ✅ Scan valid token → Returns ticket info
- ✅ Scan valid code → Returns ticket info
- ❌ No token or code → 400 Bad Request
- ❌ Invalid token → 400 Bad Request
- ❌ Invalid code → 400 Bad Request

---

### Endpoint 4: Verify Ticket

**Request:**
```bash
curl -X POST 'http://localhost:1337/api/tickets/100/verify' \
  -H 'Authorization: Bearer eyJhbGc...' \
  -H 'Content-Type: application/json' \
  -d '{
    "verificationMode": "scanned"
  }'
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Ticket verified successfully",
  "data": {
    "id": "100",
    "verification_status": "verified",
    "verified_at": "2024-01-15T15:30:00.000Z",
    "verified_by": "2",
    "ticket_code": "TK-20240115-0001",
    "buyer_name": "John Doe"
  }
}
```

**Verification Log Created:**
```json
{
  "id": "v100",
  "ticket_detail": "100",
  "ticket_code": "TK-20240115-0001",
  "verification_type": "scanned",
  "verified_by": "2",
  "verified_at": "2024-01-15T15:30:00.000Z",
  "result": "success",
  "ip_address": "192.168.1.100",
  "device_info": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
  "notes": null
}
```

**Test Cases:**
- ✅ Verify unused ticket → Status changes to verified
- ✅ Creates verification log → Log entry recorded
- ❌ Verify already verified → May fail or update (design choice)
- ❌ Non-owner ticket → 403 Forbidden
- ❌ Invalid ticket ID → 404 Not Found

---

### Endpoint 5: Get Verification History

**Request:**
```bash
curl -X GET 'http://localhost:1337/api/tickets/100/verification-history?page=1&pageSize=10' \
  -H 'Authorization: Bearer eyJhbGc...' \
  -H 'Content-Type: application/json'
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "v100",
      "ticket_code": "TK-20240115-0001",
      "verification_type": "scanned",
      "verified_by": {
        "id": "2",
        "username": "scanner1"
      },
      "verified_at": "2024-01-15T15:30:00.000Z",
      "result": "success",
      "ip_address": "192.168.1.100",
      "device_info": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
      "notes": null
    },
    {
      "id": "v101",
      "ticket_code": "TK-20240115-0001",
      "verification_type": "manual",
      "verified_by": {
        "id": "3",
        "username": "admin"
      },
      "verified_at": "2024-01-15T15:35:00.000Z",
      "result": "success",
      "ip_address": "192.168.1.101",
      "device_info": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)...",
      "notes": "Manual verification for test"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 2,
    "pageCount": 1
  }
}
```

**Test Cases:**
- ✅ Get history for verified ticket → Returns all logs
- ✅ Pagination → Works correctly
- ❌ Non-owner ticket → 403 Forbidden
- ❌ Invalid ticket ID → 404 Not Found

---

### Endpoint 6: Send Ticket Invitation

**Request:**
```bash
curl -X POST 'http://localhost:1337/api/tickets/send-invitation' \
  -H 'Authorization: Bearer eyJhbGc...' \
  -H 'Content-Type: application/json' \
  -d '{
    "ticketId": "1",
    "productId": "456",
    "variantId": "VIP",
    "recipients": [
      {
        "name": "Jane Smith",
        "email": "jane@example.com",
        "phone": "+62812345678"
      },
      {
        "name": "Bob Johnson",
        "email": "bob@example.com",
        "phone": "+62812345679"
      },
      {
        "name": "Invalid Email",
        "email": "invalid-email",
        "phone": "+62812345680"
      }
    ],
    "message": "Welcome to our concert! Please join us on January 20, 2024."
  }'
```

**Expected Response (200 OK - Partial Success):**
```json
{
  "success": true,
  "message": "Invitations sent successfully to 2 recipients",
  "data": {
    "ticketsCreated": 2,
    "successCount": 2,
    "failedCount": 1,
    "tickets": [
      {
        "id": "102",
        "ticket_code": "TK-20240115-0003",
        "unique_token": "ghi789jkl012mno345pqr678stu...",
        "qr_code": "data:image/png;base64,iVBORw0KGgoAAAANS...",
        "buyer_name": "Jane Smith",
        "buyer_email": "jane@example.com",
        "is_bypass": true,
        "created_at": "2024-01-15T16:00:00.000Z"
      },
      {
        "id": "103",
        "ticket_code": "TK-20240115-0004",
        "unique_token": "jkl012mno345pqr678stu901vwx...",
        "qr_code": "data:image/png;base64,iVBORw0KGgoAAAANS...",
        "buyer_name": "Bob Johnson",
        "buyer_email": "bob@example.com",
        "is_bypass": true,
        "created_at": "2024-01-15T16:00:00.000Z"
      }
    ]
  }
}
```

**Send History Record Created:**
```json
{
  "id": "send1",
  "ticket": "1",
  "product": "456",
  "variant": "VIP",
  "sent_by": "1",
  "recipient_count": 3,
  "successful_count": 2,
  "failed_count": 1,
  "recipients": "[{...}, {...}, {...}]",
  "message": "Welcome to our concert! Please join us on January 20, 2024.",
  "sent_at": "2024-01-15T16:00:00.000Z",
  "status": "partially_sent",
  "email_template": "default"
}
```

**Emails Sent:**
- Email to jane@example.com ✅
- Email to bob@example.com ✅
- Email to invalid@example.com ❌ (Invalid format or delivery failed)

**Test Cases:**
- ✅ Send to valid recipients → Creates tickets + sends emails
- ✅ Partial failure → Returns partial success
- ✅ Bypass tickets created → is_bypass = true
- ✅ QR codes included in response → Base64 encoded PNG
- ❌ Non-owner ticket → 403 Forbidden
- ❌ Invalid ticket ID → 404 Not Found
- ❌ No recipients → 400 Bad Request

---

### Endpoint 7: Get Send History

**Request:**
```bash
curl -X GET 'http://localhost:1337/api/tickets/send-history?page=1&pageSize=10&ticketId=1' \
  -H 'Authorization: Bearer eyJhbGc...' \
  -H 'Content-Type: application/json'
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "send1",
      "ticket": {
        "id": "1",
        "title": "Concert 2024"
      },
      "product": {
        "id": "456",
        "title": "Concert Tickets"
      },
      "variant": "VIP",
      "recipient_count": 2,
      "successful_count": 2,
      "failed_count": 0,
      "recipients": "[{\"name\":\"Jane Smith\",\"email\":\"jane@example.com\"},{\"name\":\"Bob Johnson\",\"email\":\"bob@example.com\"}]",
      "message": "Welcome to our concert!",
      "sent_at": "2024-01-15T16:00:00.000Z",
      "status": "sent"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 1,
    "pageCount": 1
  }
}
```

**Test Cases:**
- ✅ Get all send history → Returns all sends
- ✅ Filter by ticket → Returns only for that ticket
- ✅ Pagination → Works correctly
- ❌ Without filter → Returns all user's sends

---

## Error Scenarios & Responses

### 401 Unauthorized
```json
{
  "error": {
    "status": 401,
    "name": "UnauthorizedError",
    "message": "Invalid token."
  }
}
```

### 403 Forbidden
```json
{
  "error": {
    "status": 403,
    "name": "ForbiddenError",
    "message": "Not authorized to view this ticket"
  }
}
```

### 404 Not Found
```json
{
  "error": {
    "status": 404,
    "name": "NotFoundError",
    "message": "Ticket not found"
  }
}
```

### 400 Bad Request
```json
{
  "error": {
    "status": 400,
    "name": "ValidationError",
    "message": "Either encodedToken or ticketCode is required"
  }
}
```

---

## Postman Collection

### Import Instructions

1. Create a new Postman Collection called "Ticket Management API"
2. Set collection-level variable:
   ```
   {{jwt}} = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   {{base_url}} = http://localhost:1337
   ```

### Requests

```json
{
  "info": {
    "name": "Ticket Management API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "1. Get Ticket Summary",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{jwt}}",
            "type": "text"
          }
        ],
        "url": {
          "raw": "{{base_url}}/api/tickets/summary",
          "host": ["{{base_url}}"],
          "path": ["api", "tickets", "summary"]
        }
      }
    },
    {
      "name": "2. Get Ticket Details",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{jwt}}",
            "type": "text"
          }
        ],
        "url": {
          "raw": "{{base_url}}/api/tickets/1/details?page=1&pageSize=10&search=&verificationStatus=&paymentStatus=&sortBy=created_at&sortOrder=desc",
          "host": ["{{base_url}}"],
          "path": ["api", "tickets", "1", "details"],
          "query": [
            {"key": "page", "value": "1"},
            {"key": "pageSize", "value": "10"},
            {"key": "search", "value": ""},
            {"key": "verificationStatus", "value": ""},
            {"key": "paymentStatus", "value": ""},
            {"key": "sortBy", "value": "created_at"},
            {"key": "sortOrder", "value": "desc"}
          ]
        }
      }
    },
    {
      "name": "3. Scan Ticket",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{jwt}}",
            "type": "text"
          },
          {
            "key": "Content-Type",
            "value": "application/json",
            "type": "text"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"encodedToken\": \"abc123xyz...\"\n}"
        },
        "url": {
          "raw": "{{base_url}}/api/tickets/scan",
          "host": ["{{base_url}}"],
          "path": ["api", "tickets", "scan"]
        }
      }
    },
    {
      "name": "4. Verify Ticket",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{jwt}}",
            "type": "text"
          },
          {
            "key": "Content-Type",
            "value": "application/json",
            "type": "text"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"verificationMode\": \"scanned\"\n}"
        },
        "url": {
          "raw": "{{base_url}}/api/tickets/100/verify",
          "host": ["{{base_url}}"],
          "path": ["api", "tickets", "100", "verify"]
        }
      }
    },
    {
      "name": "5. Get Verification History",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{jwt}}",
            "type": "text"
          }
        ],
        "url": {
          "raw": "{{base_url}}/api/tickets/100/verification-history?page=1&pageSize=10",
          "host": ["{{base_url}}"],
          "path": ["api", "tickets", "100", "verification-history"],
          "query": [
            {"key": "page", "value": "1"},
            {"key": "pageSize", "value": "10"}
          ]
        }
      }
    },
    {
      "name": "6. Send Ticket Invitation",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{jwt}}",
            "type": "text"
          },
          {
            "key": "Content-Type",
            "value": "application/json",
            "type": "text"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"ticketId\": \"1\",\n  \"productId\": \"456\",\n  \"variantId\": \"VIP\",\n  \"recipients\": [\n    {\n      \"name\": \"Jane Smith\",\n      \"email\": \"jane@example.com\",\n      \"phone\": \"+62812345678\"\n    }\n  ],\n  \"message\": \"Join us at our concert!\"\n}"
        },
        "url": {
          "raw": "{{base_url}}/api/tickets/send-invitation",
          "host": ["{{base_url}}"],
          "path": ["api", "tickets", "send-invitation"]
        }
      }
    },
    {
      "name": "7. Get Send History",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{jwt}}",
            "type": "text"
          }
        ],
        "url": {
          "raw": "{{base_url}}/api/tickets/send-history?page=1&pageSize=10&ticketId=1",
          "host": ["{{base_url}}"],
          "path": ["api", "tickets", "send-history"],
          "query": [
            {"key": "page", "value": "1"},
            {"key": "pageSize", "value": "10"},
            {"key": "ticketId", "value": "1"}
          ]
        }
      }
    }
  ]
}
```

---

## Quick Test Workflow

### Step 1: Authenticate
```bash
# Get JWT token
TOKEN=$(curl -s -X POST 'http://localhost:1337/api/auth/local' \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"vendor@example.com","password":"password123"}' | jq -r '.jwt')

echo "Token: $TOKEN"
```

### Step 2: Get Summary
```bash
curl -X GET 'http://localhost:1337/api/tickets/summary' \
  -H "Authorization: Bearer $TOKEN"
```

### Step 3: Get Details
```bash
# Use ticket ID from summary response
curl -X GET 'http://localhost:1337/api/tickets/1/details?page=1&pageSize=5' \
  -H "Authorization: Bearer $TOKEN"
```

### Step 4: Send Invitation
```bash
curl -X POST 'http://localhost:1337/api/tickets/send-invitation' \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "ticketId": "1",
    "productId": "456",
    "variantId": "VIP",
    "recipients": [
      {"name": "Test User", "email": "test@example.com", "phone": "+62812345678"}
    ],
    "message": "Test invitation"
  }'
```

---

## Performance Benchmarks

**Expected Response Times (localhost):**
- GET /summary: ~50ms
- GET /details (10 items): ~75ms
- POST /scan: ~100ms
- POST /verify: ~150ms
- POST /send-invitation (2 recipients): ~200-500ms (depends on email delivery)
- GET /send-history: ~75ms

---

## Notes

- All timestamps are in ISO 8601 format
- All IDs are strings (UUIDs or incrementing numbers)
- QR codes are base64-encoded PNG images
- Tokens are 64-character hex strings
- Page numbers start at 1
- Maximum page size recommended: 100

---

**Last Updated:** 2024-01-15  
**Version:** 1.0

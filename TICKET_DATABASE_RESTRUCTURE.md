# Ticket Database Restructure - Complete Implementation Guide

**Date:** December 4, 2025  
**Status:** Database Schema Updated

---

## 📋 Overview

This document outlines the complete restructuring of the ticket product data flow to use a **separate `ticket` table** instead of the general `product` table. This separation ensures:
- ✅ Data integrity for ticket-specific fields
- ✅ Better performance with focused queries
- ✅ Clearer data model separation (Tickets vs Equipment)
- ✅ Easier maintenance and future enhancements

---

## 🗄️ Database Schema Changes

### ✅ Ticket Table (CLEANED)

**Fields REMOVED:**
- ❌ `category` - Not applicable to tickets
- ❌ `minimal_order` - Tickets use variant-level quotas
- ❌ `minimal_order_date` - Not applicable to tickets
- ❌ `kabupaten` - Use `kota_event` instead
- ❌ `region` - Redundant field

**Fields RETAINED/OPTIMIZED:**

```json
{
  "kind": "collectionType",
  "collectionName": "tickets",
  "attributes": {
    "users_permissions_user": {
      "type": "relation",
      "relation": "oneToOne",
      "target": "plugin::users-permissions.user",
      "required": true,
      "description": "Vendor who created this ticket product"
    },
    "title": {
      "type": "string",
      "required": true,
      "minLength": 3,
      "maxLength": 255
    },
    "description": {
      "type": "customField",
      "customField": "plugin::ckeditor5.CKEditor"
    },
    "terms_conditions": {
      "type": "customField",
      "customField": "plugin::ckeditor5.CKEditor"
    },
    "main_image": {
      "type": "media",
      "multiple": true,
      "required": true
    },
    "variant": {
      "type": "component",
      "repeatable": true,
      "component": "variant-product.variant-product",
      "required": true,
      "description": "Ticket variants with different prices and quotas"
    },
    "event_date": {
      "type": "date",
      "required": true,
      "description": "Start date of the event"
    },
    "waktu_event": {
      "type": "string",
      "regex": "^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$",
      "description": "Start time in HH:MM format"
    },
    "end_date": {
      "type": "date",
      "description": "End date of the event (optional if single day)"
    },
    "end_time": {
      "type": "string",
      "regex": "^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$",
      "description": "End time in HH:MM format"
    },
    "lokasi_event": {
      "type": "string",
      "maxLength": 500,
      "description": "Event venue/location details"
    },
    "kota_event": {
      "type": "string",
      "description": "City where the event takes place"
    },
    "rate": {
      "type": "decimal",
      "min": 0,
      "max": 5,
      "default": 5
    },
    "sold_count": {
      "type": "integer",
      "min": 0,
      "default": 0
    },
    "escrow": {
      "type": "boolean",
      "default": false
    },
    "state": {
      "type": "enumeration",
      "enum": ["pending", "rejected", "approved"],
      "default": "pending"
    },
    "ticket_details": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "api::ticket-detail.ticket-detail",
      "mappedBy": "ticket"
    },
    "blogs": {
      "type": "relation",
      "relation": "manyToMany",
      "target": "api::blog.blog",
      "mappedBy": "tickets"
    }
  }
}
```

### Product Table (FOR EQUIPMENT ONLY)

**No changes needed** - Product table remains as is for non-ticket products (equipment).

```json
{
  "attributes": {
    "category": { "type": "relation" },
    "user_event_type": { "type": "relation" },
    "kabupaten": { "type": "string" },
    "region": { "type": "string" },
    // ... other fields
  }
}
```

---

## 🔄 Data Flow Changes

### BEFORE (Current State - Mixed Data)
```
Create Product
    ↓
    ├─→ IF type = "Ticket" → Store in products table
    │       └─ Problem: Mixed with equipment data
    │
    └─→ IF type = "Equipment" → Store in products table
```

### AFTER (New State - Separated)
```
Create Product
    ↓
    ├─→ IF type = "Ticket" → Store in tickets table ✅
    │       └─ Clean ticket-specific fields
    │
    └─→ IF type = "Equipment" → Store in products table ✅
            └─ Clean equipment-specific fields
```

---

## 📱 Frontend API Endpoints Changes

### Create Ticket Product
```typescript
// BEFORE
POST /api/products
{
  title: "Concert 2025",
  user_event_type: ticket_id,
  category: 1,
  minimal_order: 1,
  variant: [...],
  event_date: "2025-12-15"
}

// AFTER
POST /api/tickets
{
  title: "Concert 2025",
  variant: [...],
  event_date: "2025-12-15",
  waktu_event: "19:00",
  end_date: "2025-12-15",
  end_time: "23:00",
  kota_event: "Jakarta",
  lokasi_event: "Jakarta Convention Center"
}
```

### List Vendor Tickets
```typescript
// BEFORE
GET /api/products?filters[user_event_type.name][$eq]=Tiket
  └─ Returns mixed products data

// AFTER
GET /api/tickets?filters[users_permissions_user][$eq]=${vendorId}
  └─ Returns only ticket products
```

### List All Tickets (Public)
```typescript
// NEW ENDPOINT
GET /api/tickets?populate=*
  └─ For displaying tickets on frontend
```

---

## 🛠️ Implementation Roadmap

### Phase 1: Backend Setup ✅ DONE
- [x] Update ticket schema (remove unnecessary fields)
- [ ] Create migration for existing ticket data (if any)
- [ ] Create ticket controller
- [ ] Create ticket service
- [ ] Create ticket routes

### Phase 2: Frontend Adaptation
- [ ] Update add-ticket form to use `/api/tickets` endpoint
- [ ] Update edit-ticket form to use `/api/tickets/:id` endpoint
- [ ] Update ticket list page to use new endpoint
- [ ] Update product creation flow (route to correct endpoint based on type)
- [ ] Update cart/checkout to handle tickets properly

### Phase 3: Data Migration (if needed)
- [ ] Identify existing ticket products in `products` table
- [ ] Create migration script to move to `tickets` table
- [ ] Update vendor product counts
- [ ] Verify data integrity

### Phase 4: Testing & Validation
- [ ] Test create ticket product flow
- [ ] Test edit ticket product flow
- [ ] Test delete ticket product flow
- [ ] Test vendor ticket dashboard
- [ ] Test cart integration with new ticket endpoint
- [ ] Test checkout process
- [ ] Test payment and transaction flow

---

## 📝 Affected Frontend Files

### Files that need update:

1. **Product Creation Flow**
   - `app/user/vendor/add-product/page.tsx`
   - `app/user/vendor/add-product/TicketAdd.tsx`
   - `app/user/vendor/add-product/EquipmentAdd.tsx`

2. **Product Listing & Management**
   - `app/user/vendor/products/page.tsx`
   - `app/user/vendor/products/edit/[slug]/page.tsx`
   - `app/user/vendor/products/edit/[slug]/ContentProductEdit.tsx`

3. **Ticket Management Dashboard**
   - `app/user/vendor/tickets/page.tsx`
   - `components/profile/vendor/ticket-management/TicketDashboard.tsx`
   - `components/profile/vendor/ticket-management/TicketDetailPage.tsx`

4. **Product Display**
   - `app/products/[slug]/page.tsx`
   - `app/products/ProductContent.tsx`

5. **API/Service Layer**
   - `lib/services.ts` - Add `axiosTicket` function
   - `lib/productUtils.ts` - Add ticket-specific utilities

---

## 🔌 API Service Functions to Create

### New Service File: `lib/services.ts` additions

```typescript
// Ticket API Service
export const axiosTicket = async (
  method: string,
  url: string,
  token?: string,
  data?: any
) => {
  return await axios({
    method,
    url: `${process.env.NEXT_PUBLIC_API_URL}${url}`,
    headers: {
      Authorization: token ? `Bearer ${token}` : undefined,
      "Content-Type": "application/json",
    },
    data,
  });
};

// Example usage:
// Create ticket
axiosTicket("POST", "/api/tickets", token, ticketData);

// Get vendor tickets
axiosTicket("GET", `/api/tickets?filters[users_permissions_user][$eq]=${vendorId}`, token);

// Update ticket
axiosTicket("PUT", `/api/tickets/${ticketId}`, token, updatedData);

// Delete ticket
axiosTicket("DELETE", `/api/tickets/${ticketId}`, token);
```

---

## ✅ Field Validation Rules

### Ticket-Specific Validation

```typescript
// Event Date Validation
- Must be in future
- Format: YYYY-MM-DD
- Cannot be empty

// Time Validation
- Format: HH:MM (24-hour)
- Valid range: 00:00 - 23:59
- Optional fields

// Location Validation
- kota_event: Required, min 3 chars
- lokasi_event: Optional, max 500 chars

// Variant Validation
- At least 1 variant required
- Each variant must have: name, price, quota
- Quota must be positive integer

// Title Validation
- Min 3, Max 255 characters
- Required field

// Description/Terms Validation
- Optional fields
- Can contain HTML from CKEditor
```

---

## 🚨 Important Notes

### Breaking Changes
1. Old ticket data in `products` table needs migration
2. Frontend endpoints change from `/api/products` to `/api/tickets`
3. Query filters change from `user_event_type` to `users_permissions_user`

### Data Integrity
1. Keep `product.state` and `ticket.state` synchronized
2. Vendor can only create tickets with their own `users_permissions_user` ID
3. Automatic timestamps for createdAt, updatedAt

### Performance Improvements
1. Faster queries (smaller table)
2. Separate indexes for ticket vs equipment products
3. Optimized filtering by vendor

---

## 📌 Next Steps

1. ✅ Update ticket schema - **DONE**
2. ⏭️ Create Strapi controller for tickets
3. ⏭️ Create Strapi service for tickets
4. ⏭️ Create Strapi routes for tickets
5. ⏭️ Update frontend service layer (axiosTicket)
6. ⏭️ Update add-ticket form to use new endpoint
7. ⏭️ Update edit-ticket form to use new endpoint
8. ⏭️ Update vendor product pages
9. ⏭️ Update ticket management dashboard
10. ⏭️ Test complete flow end-to-end

---

## 💾 Database Migration (If Needed)

If there are existing ticket products in the `products` table:

```sql
-- Step 1: Create tickets from products where type = ticket
INSERT INTO tickets (
  users_permissions_user, title, description, terms_conditions,
  main_image, variant, event_date, waktu_event, end_date, end_time,
  lokasi_event, kota_event, rate, sold_count, escrow, state,
  createdAt, updatedAt, published_at
)
SELECT
  users_permissions_user, title, description, terms_conditions,
  main_image, variant, event_date, waktu_event, end_date, end_time,
  lokasi_event, kota_event, rate, sold_count, escrow, state,
  createdAt, updatedAt, published_at
FROM products
WHERE user_event_type.name = 'Tiket'
  OR user_event_type.id IN (SELECT id FROM user_event_types WHERE name = 'Tiket')

-- Step 2: Delete from products (AFTER backup)
DELETE FROM products
WHERE user_event_type.name = 'Tiket'

-- Step 3: Update transaction_tickets to reference tickets table
ALTER TABLE transaction_tickets
ADD COLUMN ticket_id INT,
ADD FOREIGN KEY (ticket_id) REFERENCES tickets(id)

-- Update existing references
UPDATE transaction_tickets
SET ticket_id = (SELECT id FROM tickets WHERE id = transaction_tickets.product_id)
WHERE product_id IN (SELECT id FROM tickets)
```

---

**Last Updated:** December 4, 2025  
**Status:** Schema Updated - Ready for controller/service implementation

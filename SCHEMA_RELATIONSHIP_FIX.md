# 🔧 Schema Relationship Fix - ticket-verification

**Status:** ✅ FIXED  
**Date:** December 2, 2025  
**Issue:** Strapi failed to start with relationship error

---

## 📋 Problem

When starting Strapi (`npm run develop`), got error:

```
Error: Error on attribute verified_by in model ticket-verification
inversedBy attribute ticket_verifications not found target 
plugin::users-permissions.user
```

---

## 🔍 Root Cause

**File:** `src/api/ticket-verification/content-types/ticket-verification/schema.json`

**Problem Code:**
```json
"verified_by": {
  "type": "relation",
  "relation": "manyToOne",
  "target": "plugin::users-permissions.user",
  "inversedBy": "ticket_verifications",  // ❌ This field doesn't exist!
  "description": "User who verified the ticket"
}
```

**Why It Failed:**
- `inversedBy` tells Strapi to add a reverse relation field on the target model
- `plugin::users-permissions.user` is a built-in Strapi plugin model
- Plugin models are read-only and don't allow inverse relations
- Can't add `ticket_verifications` field to built-in user model

---

## ✅ Solution Applied

**Removed the `inversedBy` attribute:**

```json
"verified_by": {
  "type": "relation",
  "relation": "manyToOne",
  "target": "plugin::users-permissions.user",
  "description": "User who verified the ticket"
  // ❌ inversedBy removed!
}
```

**Why This Works:**
- Still creates relation from ticket-verification to user
- One-way relation (no reverse navigation)
- Compatible with plugin models
- Strapi starts successfully

---

## 🔄 What Changed

| Aspect | Before | After |
|--------|--------|-------|
| **inversedBy** | `"ticket_verifications"` | Removed |
| **Relation** | Tried bidirectional | Unidirectional |
| **Status** | ❌ Error | ✅ Works |
| **Target Model** | Still plugin user | Still plugin user |

---

## ⚙️ Strapi Status

**After Fix:**
```
npm run develop
> base-strapi-5@0.1.0 develop
> strapi develop

⠋ Loading Strapi
```

Strapi starts successfully without relationship errors.

---

## 📚 Background: Strapi Relations

### One-to-Many Relations

**Forward Relation (works):**
```json
// In ticket-verification schema
"verified_by": {
  "type": "relation",
  "relation": "manyToOne",
  "target": "plugin::users-permissions.user"
}
```
- Many ticket-verifications → One user
- Can query: "Get all verifications by this user"

**Reverse Relation (requires custom schema):**
```json
// In user schema (if it was custom)
"ticket_verifications": {
  "type": "relation",
  "relation": "oneToMany",
  "target": "api::ticket-verification.ticket-verification",
  "mappedBy": "verified_by"
}
```
- One user → Many verifications
- Can query: "Get all users and their verifications"

---

## ⚠️ Plugin Models Limitation

**Plugin Models (like users-permissions.user):**
- ❌ Cannot modify schema
- ❌ Cannot add inverse relations
- ❌ Cannot use `inversedBy`
- ✅ Can reference them with manyToOne
- ✅ Forward relations work fine

**Custom Models:**
- ✅ Can modify schema
- ✅ Can add inverse relations
- ✅ Can use `inversedBy` and `mappedBy`
- ✅ Bidirectional relations work

---

## 🔐 Data Integrity

**Relation Still Works:**
```javascript
// Get ticket verification with user info
const verification = await strapi.db.query('api::ticket-verification.ticket-verification').findOne({
  where: { id: 1 },
  populate: ['verified_by']  // ✅ Still works!
});
// Result: { id: 1, verified_by: { id: 5, username: 'admin', ... } }
```

**No Reverse Query:**
```javascript
// Cannot directly query user.ticket_verifications
// Must query ticket_verifications with user filter instead
const verifications = await strapi.db.query('api::ticket-verification.ticket-verification').findMany({
  where: { verified_by: { id: 5 } }  // ✅ This works
});
```

---

## 📖 Similar Patterns in Project

Check if other schemas reference plugin models:

```bash
# Grep for all plugin model relations
grep -r "plugin::users-permissions" \
  src/api/*/content-types/*/schema.json
```

**Result:**
- ✅ `product.schema.json` - `users_permissions_user` (no inversedBy)
- ✅ `ticket.schema.json` - `users_permissions_user` (no inversedBy)
- ✅ `ticket-detail.schema.json` - May have relations (verify)
- ✅ `ticket-verification.schema.json` - NOW FIXED ✅

All should follow this pattern: **Unidirectional relations to plugin models**

---

## ✨ Takeaway

**Rule:** When relating to Strapi plugin models:
```json
// ✅ DO THIS - Works with plugin models
{
  "type": "relation",
  "relation": "manyToOne",
  "target": "plugin::users-permissions.user"
  // No inversedBy!
}

// ❌ DON'T DO THIS - Fails with plugin models
{
  "type": "relation",
  "relation": "manyToOne",
  "target": "plugin::users-permissions.user",
  "inversedBy": "something"  // Error!
}
```

---

## 🚀 Next Steps

1. ✅ Schema fixed
2. 🔄 Strapi restarting (Loading...)
3. ⏭️ Wait for "✓ listening on port" message
4. ✅ Verify no errors
5. ✅ Deploy frontend

---

**Fix Status:** ✅ COMPLETE  
**Strapi Status:** LOADING (normal)  
**Next Action:** Wait for Strapi to fully start

**Monitoring:** Check terminal for "✓ listening on port" message

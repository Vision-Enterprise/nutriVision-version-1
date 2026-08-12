# NutriVision — Database Documentation

Phase 1: Database Foundation

---

## Overview

NutriVision uses Supabase PostgreSQL as its database.
The V1 schema consists of 4 tables.

```
auth.users  (managed by Supabase Auth)
     |
     | auto-created by trigger
     |
  profiles ──────────────────────────────────────┐
     |                                           |
     | created_by / updated_by                   |
     |                                           |
  commodities                               audit_logs
     |
     | one commodity → many batches
     |
  batches
```

---

## Tables

### profiles

Stores application user data. Linked 1:1 to Supabase `auth.users`.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, FK → auth.users, CASCADE | Matches auth.users.id exactly |
| `full_name` | TEXT | NOT NULL | Display name |
| `role` | TEXT | NOT NULL, CHECK | `administrator` or `nutrition_personnel` |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Deactivated users cannot use the system |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Record creation time |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Auto-updated by trigger |

**Notes:**
- Passwords are never stored here. Supabase Auth manages credentials.
- Profiles are auto-created by the `handle_new_user()` trigger when a user signs up.
- Deactivation is done by setting `is_active = FALSE`. Records are never hard-deleted.

---

### commodities

Master record for each commodity type.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Surrogate primary key |
| `commodity_code` | TEXT | NOT NULL, UNIQUE | Short code. Example: `VA-CAP` |
| `name` | TEXT | NOT NULL | Full commodity name |
| `description` | TEXT | nullable | Optional notes |
| `category` | TEXT | NOT NULL | Vitamins, Minerals, etc. |
| `unit` | TEXT | NOT NULL | Capsule, Tablet, Sachet, etc. |
| `created_by` | UUID | NOT NULL, FK → profiles | Who registered this commodity |
| `updated_by` | UUID | nullable, FK → profiles | Who last modified this commodity |
| `deleted_at` | TIMESTAMPTZ | nullable | NULL = active. Timestamp = soft-deleted. |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Record creation time |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Auto-updated by trigger |

**Notes:**
- `commodity_code` must be unique across the system.
- Soft delete: set `deleted_at = NOW()`. Never use DELETE.
- Active records query: `WHERE deleted_at IS NULL`

---

### batches

Individual delivery batches for a commodity.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Surrogate primary key |
| `commodity_id` | UUID | NOT NULL, FK → commodities | Parent commodity |
| `batch_number` | TEXT | NOT NULL | Delivery batch identifier |
| `quantity` | INTEGER | NOT NULL, CHECK ≥ 0 | Current stock quantity |
| `expiration_date` | DATE | NOT NULL | Expiry date (no time component) |
| `created_by` | UUID | NOT NULL, FK → profiles | Who created this batch |
| `updated_by` | UUID | nullable, FK → profiles | Who last modified this batch |
| `deleted_at` | TIMESTAMPTZ | nullable | NULL = active |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Record creation time |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Auto-updated by trigger |

**Constraints:**
- `UNIQUE (commodity_id, batch_number)` — batch numbers are unique per commodity, not globally
- `CHECK (quantity >= 0)` — quantity cannot be negative

**Notes:**
- Expiration status is calculated at query time from `expiration_date`.
- Never store derived values like `expiration_status = 'red'` in the database.
- Active records query: `WHERE deleted_at IS NULL`

---

### audit_logs

Append-only record of system activity.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Surrogate primary key |
| `user_id` | UUID | NOT NULL, FK → profiles | Who performed the action |
| `action` | TEXT | NOT NULL | Action type (see constants below) |
| `entity_type` | TEXT | nullable | What type of record was affected |
| `entity_id` | UUID | nullable | Which specific record was affected |
| `description` | TEXT | nullable | Human-readable description |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | When the action occurred |

**Notes:**
- Records are **never updated or deleted**. The table is append-only.
- `entity_type` and `entity_id` are NULL for session events (LOGIN, LOGOUT).

---

## Action Types

Defined in `src/shared/constants/app.constants.js`:

| Action | entity_type | Description |
|--------|-------------|-------------|
| `LOGIN` | null | User logged in |
| `LOGOUT` | null | User logged out |
| `CREATE_USER` | `profile` | Admin created a user account |
| `ACTIVATE_USER` | `profile` | Admin activated a user |
| `DEACTIVATE_USER` | `profile` | Admin deactivated a user |
| `CREATE_COMMODITY` | `commodity` | Commodity registered |
| `UPDATE_COMMODITY` | `commodity` | Commodity record updated |
| `DELETE_COMMODITY` | `commodity` | Commodity soft-deleted |
| `CREATE_BATCH` | `batch` | Batch added to a commodity |
| `UPDATE_BATCH` | `batch` | Batch record updated |
| `DELETE_BATCH` | `batch` | Batch soft-deleted |

---

## Expiration Status Logic

Expiration status is **never stored in the database**. It is calculated:

```
days_remaining = expiration_date - TODAY

IF days_remaining > 90  → GOOD       (green)
IF days_remaining > 30  → MODERATE   (amber)
IF days_remaining > 0   → NEAR EXPIRY (red)
IF days_remaining <= 0  → EXPIRED    (dark)
```

Thresholds are defined in `src/shared/constants/app.constants.js`:

```js
export const EXPIRATION_THRESHOLDS = {
  GOOD_DAYS: 90,
  NEAR_EXPIRY_DAYS: 30,
};
```

---

## Row Level Security

RLS is enabled on all 4 tables. No table is publicly accessible.

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `profiles` | Any authenticated user | Trigger only | Own row or admin | Not permitted |
| `commodities` | Any authenticated (active only) | Any authenticated | Creator or admin | Not permitted |
| `batches` | Any authenticated (active only) | Any authenticated | Creator or admin | Not permitted |
| `audit_logs` | Own logs or admin sees all | Any authenticated (own user_id) | Not permitted | Not permitted |

---

## Indexes

| Index | Table | Column(s) | Purpose |
|-------|-------|-----------|---------|
| `idx_commodities_deleted_at` | commodities | deleted_at (WHERE NULL) | Filter active commodities |
| `idx_commodities_code` | commodities | commodity_code | Code lookup/search |
| `idx_batches_commodity_id` | batches | commodity_id | FK join lookup |
| `idx_batches_expiration_date` | batches | expiration_date | Expiration monitoring queries |
| `idx_batches_deleted_at` | batches | deleted_at (WHERE NULL) | Filter active batches |
| `idx_audit_logs_user_id` | audit_logs | user_id | User's own activity |
| `idx_audit_logs_created_at` | audit_logs | created_at DESC | Chronological display |

---

## SQL Files

| File | Purpose | Run order |
|------|---------|-----------|
| `database/01_schema.sql` | Tables, functions, triggers, indexes | First |
| `database/02_rls.sql` | RLS enable + policies | Second |

Run in Supabase Dashboard → SQL Editor → New query.

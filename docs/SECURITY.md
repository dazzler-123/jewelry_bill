# Security & Financial Integrity Architecture

This document details the security design, transaction auditing, structured logging, financial verification formulas, and database backup strategy for the Aurum POS & Inventory System.

---

## 1. Authentication & Authorization

### Token-Based Session Security
- **JWT Authentication**: Users receive an encrypted JSON Web Token (JWT) on successful login (`POST /auth/login`).
- **Signature Security**: The token is signed using a secure environment variable `JWT_SECRET`. If not provided, it falls back to a long fallback secret key during development.
- **Access Lifespan**: Access tokens are configured to expire after 8 hours to minimize session hijacking risk.

### Granular Authorization (RBAC)
- **Role Permissions Mapping**: Custom permissions are assigned to user roles (`ADMIN`, `MANAGER`, `CASHIER`).
- **Decorators**: Actions are protected at the controller layer via `@RequirePermissions(...)` to enforce strict privilege controls.
- **Guard Validation**: Requests are validated via `AuthGuard` and `PermissionsGuard` before reaching endpoint methods.

| Role | Allowed Permissions |
| :--- | :--- |
| **ADMIN** | Full administrative rights, user profile management (`users.create`, `users.edit`), system configs (`settings.manage`). |
| **MANAGER** | Stock intakes (`inventory.create`, `inventory.edit`), pricing adjustments (`metalRate.edit`), billing controls (`billing.create`, `billing.view`). |
| **CASHIER** | Checkout POS sales (`inventory.sell`, `billing.create`), read-only bills history (`billing.view`). |

---

## 2. Structured System Auditing

Every state modification operation on critical financial and stock records is audited in the `AuditLog` collection. We capture the user ID, timestamp, entity identity, operation name, and state differences.

### Sanitized Audited Operations

- **Invoice creations, edits, and cancellations**: Tracked with item snapshots and pricing states in the `bills` controller.
- **Payments and payment reversals (refunds)**: Audited on registration and status transitions.
- **Inventory changes**: Intakes and adjustments track old/new states in `inventory` controller.
- **Metal spot rates**: Logged on addition, update, and deletions of spot rates.
- **User modifications**: Audited with strict data sanitization (password hashes and secrets are explicitly excluded).
- **Shop Settings configurations**: Audited detailing updated shop address, tax rates, website URLs, and bank details.

---

## 3. Financial Integrity Formulas

To prevent calculation discrepancy leakages, all sales prices are computed via a standardized calculation engine ([calculation.engine.ts](file:///e:/Demo/jewelary_billing/backend/src/services/billing/calculation/calculation.engine.ts)) enforcing exact formulas:

### Line Item Pricing Formula
$$\text{Net Weight} = \text{Gross Weight} - \text{Stone Weight} - \text{Other Weight}$$

$$\text{Metal Value} = \text{Net Weight} \times \text{Spot Metal Rate}$$

$$\text{Making Charge Amount} = \begin{cases} 
      \text{Rate per Gram} \times \text{Gross Weight} & \text{if FLAT\_PER\_GRAM} \\
      \text{Rate} \% \times \text{Metal Value} & \text{if PERCENTAGE} \\
      \text{Rate} & \text{if FIXED}
   \end{cases}$$

$$\text{Wastage Charge Amount} = \begin{cases} 
      \text{Rate per Gram} \times \text{Metal Rate} \times \text{Gross Weight} & \text{if PERCENTAGE} \\
      \text{Rate} & \text{if FIXED}
   \end{cases}$$

$$\text{Stone Charge Amount} = \text{Pieces} \times \text{Stone Rate} + \text{Carats} \times \text{Carat Rate}$$

$$\text{Taxable Subtotal} = \text{Metal Value} + \text{Making Charges} + \text{Wastage} + \text{Stones} + \text{Other Charges} - \text{Discounts}$$

$$\text{Tax Amount (GST)} = \text{Taxable Subtotal} \times (\text{CGST \%} + \text{SGST \%} \text{ or } \text{IGST \%})$$

$$\text{Item Grand Total} = \text{Taxable Subtotal} + \text{Tax Amount}$$

### Bill Summary Formulas
$$\text{Invoice Total} = \sum (\text{Line Item Grand Totals})$$

$$\text{Outstanding Balance} = \text{Invoice Total} - \text{Sum of Verified Payments} + \text{Adjustments}$$

---

## 4. Structured Logging Rules

Structured logging is managed using the NestJS standard `Logger` class. We enforce log output sanitization to prevent sensitive data leakages.

### Sanitization Constraints
- **Passwords & Hashes**: Never include password strings, bcrypt hashes, or credential recovery tokens in logs.
- **Authentication tokens**: Exclude full JWT payload signatures, access tokens, or refresh keys.
- **Personal Demographics**: Anonymize email addresses and full phone digits in debug logs where appropriate.

---

## 5. Database Backup & Recovery Plan

A standard backup strategy is defined for MongoDB to prevent data losses in production:

### Backup Frequency
- **Daily Automated Backups**: A daily cron utility exports a full snapshot of the Mongo database at 23:00 hours during non-business periods.
- **Retention Duration**: Retain snapshots locally for 30 days and sync them to encrypted AWS S3 buckets (or secure offline storage) with a 90-day retention lifespan.

### Automated Export Script
```bash
# Export script run by cron job
mongodump --uri="mongodb://127.0.0.1:27017/jewelry_billing" --out="/var/backups/mongodb/backup-$(date +%F)" --gzip
```

### Recovery & Restore Procedure
In the event of database failure or hardware damage:
1. Provisions a fresh MongoDB instance.
2. Selects the most recent daily backup snapshot archive.
3. Restores collections by executing:
   ```bash
   mongorestore --drop --uri="mongodb://127.0.0.1:27017/jewelry_billing" --gzip "/var/backups/mongodb/backup-<date_folder>"
   ```
4. Verifies database connectivity and runs NestJS migrations or health checks to validate indices.

# Jewelry Billing & Shop Management System

## ROLE

You are the lead software architect and senior full-stack engineer responsible for building a production-ready Jewelry Billing & Shop Management System.

The application will be developed using:

* Next.js
* React
* TypeScript
* MongoDB
* Mongoose
* Material UI (MUI)
* PWA / offline-ready architecture

The application is primarily designed for a jewelry shop operating on Windows desktop computers, but it must also be responsive on tablets and mobile devices.

---

# CORE PRODUCT

Build a complete jewelry shop management system containing:

1. Dashboard
2. Billing
3. Customers
4. Jewelry Products
5. Inventory
6. Gold/Silver/Metal Rates
7. Payments
8. Due/Outstanding Management
9. Bill Editing
10. Bill Revision History
11. Returns
12. Refunds
13. Reports
14. Users
15. Roles & Permissions
16. Shop Settings
17. Invoice Templates
18. Printing
19. PDF generation
20. WhatsApp sharing
21. Audit Logs
22. Notifications
23. PWA support
24. Offline-ready architecture

---

# NON-NEGOTIABLE DEVELOPMENT RULES

## 1. Do not break existing functionality

Before modifying existing code:

* Inspect the current implementation.
* Understand existing components.
* Reuse existing functionality.
* Do not unnecessarily rewrite working code.
* Do not duplicate components.
* Do not create multiple implementations of the same business logic.

---

## 2. Business logic must not live inside UI components

Separate:

* UI
* API
* business logic
* validation
* database
* calculations

For example:

```text
React Component
      ↓
Feature Service
      ↓
Business Logic
      ↓
Database/API
```

---

## 3. Centralize financial calculations

Create a dedicated calculation engine.

All billing calculations must go through the same engine.

Never calculate totals independently in:

* React
* PDF
* Print
* API
* Reports

The backend/server-side calculation must be authoritative.

---

# TECHNOLOGY

## Frontend

* Next.js
* React
* TypeScript
* Material UI
* MUI DataGrid
* React Hook Form
* Zod
* TanStack Query where appropriate

## Backend

Use Next.js server-side APIs / Route Handlers.

Do not create a separate backend unless there is a strong architectural reason.

## Database

MongoDB + Mongoose.

## Authentication

Implement secure authentication and role-based authorization.

---

# UI DESIGN

The application should look like a premium modern jewelry POS.

Use:

* MUI
* clean white/light surfaces
* charcoal typography
* subtle gold accent
* professional financial tables
* compact controls
* strong hierarchy
* minimal shadows
* consistent spacing
* responsive layout

Avoid:

* excessive gradients
* excessive rounded cards
* oversized headings
* clutter
* unnecessary animations
* generic admin-dashboard appearance

---

# APPLICATION STRUCTURE

```text
src/
├── app/
├── components/
├── features/
│   ├── dashboard/
│   ├── billing/
│   ├── customers/
│   ├── products/
│   ├── inventory/
│   ├── payments/
│   ├── metal-rates/
│   ├── reports/
│   ├── users/
│   └── settings/
│
├── models/
├── services/
├── lib/
├── hooks/
├── types/
├── validations/
├── theme/
├── config/
└── utils/
```

---

# DATABASE COLLECTIONS

At minimum:

```text
users
customers
products
inventoryItems
bills
billRevisions
payments
refunds
returns
metalRates
shopSettings
auditLogs
notifications
```

---

# CRITICAL FINANCIAL RULES

## Historical rates

When a bill is created, store the actual rate used.

Example:

```text
18K rate = ₹9,500/g
```

If the rate later becomes ₹9,700/g, the old bill must continue showing ₹9,500/g.

---

## Payments

Never rely on a single editable `paidAmount`.

Store individual payment transactions.

Example:

```text
Bill = ₹1,78,447

Payment 1 = ₹80,000 UPI
Payment 2 = ₹50,000 Cash
Payment 3 = ₹48,447 Bank
```

The system calculates:

```text
Outstanding = Bill Total - Valid Payments
```

---

# BILL STATUS

Support:

```text
DRAFT
UNPAID
PARTIALLY_PAID
PAID
OVERDUE
CANCELLED
RETURNED
REFUNDED
```

Status should be derived from financial state wherever possible.

---

# BILL EDITING

Bills must be editable only according to permissions.

Editing must:

1. Preserve invoice number.
2. Preserve payment history.
3. Create a revision.
4. Recalculate totals.
5. Recalculate outstanding amount.
6. Record audit information.
7. Never silently destroy financial history.

---

# BILL CANCELLATION

Never physically delete posted bills.

Use:

```text
status = CANCELLED
```

Store:

* reason
* user
* timestamp
* previous state

---

# INVENTORY RULE

When inventory is sold:

```text
IN STOCK → SOLD
```

The system must prevent duplicate selling.

If a bill is cancelled/returned, inventory must be handled according to the return/cancellation workflow.

---

# OUTPUTS

A bill must support:

* Preview
* Print
* A4 PDF
* Thermal print
* Download
* Share
* WhatsApp

The invoice data must come from one canonical invoice representation.

---

# DEVELOPMENT PROCESS

Build incrementally.

For every phase:

1. Inspect existing project.
2. Implement only the requested phase.
3. Reuse existing components.
4. Run TypeScript checks.
5. Run lint.
6. Run tests.
7. Run production build.
8. Fix errors.
9. Update `/docs/IMPLEMENTATION_STATUS.md`.
10. Do not move to the next phase until current functionality works.

---

# DO NOT

Do not:

* hardcode financial calculations
* duplicate business logic
* delete financial records
* trust frontend permissions
* expose secrets
* store passwords directly
* use floating-point arithmetic carelessly for money
* overwrite payment history
* recalculate historical invoices using current rates
* create unnecessary microservices
* create huge monolithic React components

---

# DEFINITION OF DONE

A feature is complete only when:

* UI works
* API works
* database works
* validation works
* authorization works
* error states work
* loading states work
* empty states work
* responsive behavior works
* financial calculations are tested
* TypeScript passes
* lint passes
* build passes
* relevant tests pass
* documentation is updated

Follow this specification throughout the project.

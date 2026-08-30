# Core Business Rules — Jewelry Billing System

This document outlines the authoritative financial formulas, calculations, and transactional business rules for the Jewelry Billing & Shop Management System.

---

## 1. Billing & Financial Calculations

All financial calculations must utilize the centralized backend calculation engine to prevent inconsistencies between the UI, invoices, printed forms, and database records. Floating-point math must be handled carefully (rounding to 2 decimal places at each calculation step).

### 1.1. Line Item Total Formula
For each item in the invoice:

$$\text{Metal Value} = \text{Item Weight (grams)} \times \text{Spot Rate Per Gram}$$

$$\text{Making Charge} = \begin{cases} 
      \text{Value} & \text{if Type is FIXED} \\
      \text{Item Weight} \times \text{Value} & \text{if Type is PER\_GRAM} \\
      \text{Metal Value} \times \frac{\text{Value}}{100} & \text{if Type is PERCENTAGE}
   \end{cases}$$

$$\text{Line Item Total} = \text{Metal Value} + \text{Making Charge} + \text{Stone Value}$$

### 1.2. Grand Invoice Total Formula
For the entire invoice:

$$\text{Subtotal} = \sum (\text{Line Item Totals})$$

$$\text{Taxable Value} = \text{Subtotal} + \text{Other Charges} - \text{Discount}$$

$$\text{Tax Amount (GST)} = \text{Taxable Value} \times \text{Tax Rate (e.g., 3\%)}$$

$$\text{Grand Total} = \text{Taxable Value} + \text{Tax Amount}$$

---

## 2. Metal Rates & Historical Rate Preservation

- **Live Rates**: The shop maintains active daily spot rates for each metal (Gold, Silver, Platinum) and purity level (e.g., 24K, 22K, 18K).
- **Historical Lock-In**: When an invoice is finalized and posted, the active metal rates are copied directly into the line items.
- **Independence**: Subsequent edits or additions to the daily metal rates table **must not** modify historical invoices. Re-printing or viewing past invoices will show rates locked at the time of creation.

---

## 3. Payment Transactions & Outstanding Balance

- **No Direct Mutation**: The `paidAmount` field of an invoice must never be directly editable.
- **Transaction Ledger**: In order to clear an invoice, individual transaction records (`payments`) must be posted.
- **Derivation**: The paid amount is calculated dynamically by summing the successful payments:

$$\text{Paid Amount} = \sum (\text{Payment.amount} \text{ where status is SUCCESS})$$

$$\text{Outstanding Amount} = \text{Grand Total} - \text{Paid Amount}$$

- **Status Mapping**:
  - `PAID`: Outstanding Amount is $\le 0$.
  - `PARTIALLY_PAID`: Paid Amount is $> 0$ and Outstanding Amount is $> 0$.
  - `UNPAID`: Paid Amount is $0$.

---

## 4. Invoice Revisions & Audit Logging

- **No Destructive Edits**: Standard invoice entries must not be overwritten or updated in place without auditing.
- **Revision Snapshot**: If an authorized manager edits an invoice, the system must increment the `revisionNumber` and save a full snapshot of the previous state in the `billRevisions` collection.
- **Reason Requirement**: An audit reason must be provided by the operator before any edit transaction is committed.
- **Cancellation**: Posted invoices must never be deleted physically. Cancellations must be performed by updating the bill status to `CANCELLED`, recording the cancellation reason, date, and user ID.

---

## 5. Inventory Management & Serial Tracking

- **Unique Identification**: Premium jewelry items are serialized or barcode-tagged.
- **Status Transitions**:
  - Incoming: Item received $\to$ `IN_STOCK`.
  - Sales: Invoice posted $\to$ status transitions from `IN_STOCK` to `SOLD`.
  - Returns: Items returned on active bills $\to$ status transitions to `RETURNED` (or back to `IN_STOCK` pending inspection).
- **Duplicate Prevention**: The system must enforce unique constraints on serial numbers to prevent double-selling of items.

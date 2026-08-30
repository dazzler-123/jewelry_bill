export type MetalType = 'GOLD' | 'SILVER' | 'PLATINUM';

export type PurityGold = '24K' | '22K' | '18K' | '14K';
export type PuritySilver = '999' | '925';
export type PurityPlatinum = '950';
export type Purity = PurityGold | PuritySilver | PurityPlatinum;

export type BillStatus =
  | 'DRAFT'
  | 'UNPAID'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'OVERDUE'
  | 'CANCELLED'
  | 'RETURNED'
  | 'REFUNDED';

export type PaymentMethod = 'CASH' | 'CARD' | 'UPI' | 'BANK_TRANSFER';

export type MakingChargeType = 'PERCENTAGE' | 'PER_GRAM' | 'FIXED';

export type ProductStatus = 'ACTIVE' | 'INACTIVE';

export type InventoryStatus = 'IN_STOCK' | 'SOLD' | 'RETURNED' | 'RESERVED';

export type UserRole = 'ADMIN' | 'MANAGER' | 'CASHIER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  gstIn?: string;
  pan?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  metalType: MetalType;
  purity: Purity;
  weightRange?: string; // e.g. "5g-10g"
  categoryId?: string;
  status: ProductStatus;
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  productId: string;
  sku: string;
  serialNumber?: string;
  weight: number; // in grams
  purity: Purity;
  grossWeight: number; // in grams
  stoneWeight: number; // in grams
  stoneValue: number; // in Rupees
  makingChargeType: MakingChargeType;
  makingChargeValue: number;
  status: InventoryStatus;
  location?: string;
  createdAt: string;
}

export interface BillItem {
  inventoryItemId?: string; // Null if custom item
  sku?: string;
  name: string;
  metalType: MetalType;
  purity: Purity;
  weight: number;
  ratePerGram: number; // Historical rate at the time of purchase
  makingCharges: number;
  stoneValue: number;
  total: number; // (weight * ratePerGram) + makingCharges + stoneValue
}

export interface Bill {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string; // denormalized for search & history
  customerPhone: string; // denormalized for search & history
  items: BillItem[];
  subtotal: number; // Sum of items total before tax/charges
  makingCharges: number; // Sum of making charges
  otherCharges: number; // e.g. packaging
  discount: number;
  taxRate: number; // e.g. 3% GST
  taxAmount: number; // subtotal * taxRate
  total: number; // subtotal + taxAmount + otherCharges - discount
  paidAmount: number; // Sum of valid payments
  outstandingAmount: number; // total - paidAmount
  status: BillStatus;
  notes?: string;
  createdBy: string; // User ID
  createdAt: string;
  updatedAt: string;
}

export interface BillRevision {
  id: string;
  billId: string;
  revisionNumber: number;
  previousState: Partial<Bill>;
  changedBy: string; // User ID
  changeReason: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  billId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionReference?: string; // UPI ID, Txn ID, Card details ref
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  receivedBy: string; // User ID
  paidAt: string;
}

export interface Refund {
  id: string;
  billId: string;
  paymentId?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionReference?: string;
  status: 'SUCCESS' | 'FAILED';
  processedBy: string; // User ID
  processedAt: string;
}

export interface Return {
  id: string;
  billId: string;
  items: {
    inventoryItemId?: string;
    sku?: string;
    name: string;
    weight: number;
    value: number;
  }[];
  status: 'PROCESSED' | 'PENDING';
  processedBy: string; // User ID
  processedAt: string;
}

export interface MetalRate {
  id: string;
  metalType: MetalType;
  purity: Purity;
  ratePerGram: number;
  updatedBy: string; // User ID
  updatedAt: string;
}

export interface BankDetails {
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branchName?: string;
}

export interface ShopSettings {
  id: string;
  name: string;
  address: string;
  phone: string;
  email?: string;
  gstIn?: string;
  pan?: string;
  bankDetails?: BankDetails;
  invoicePrefix: string;
  termsAndConditions: string;
  whatsappMessageTemplate?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string; // e.g. "BILL_CREATE", "BILL_EDIT", "METAL_RATE_UPDATE"
  details: string; // JSON or text description
  timestamp: string;
  ipAddress?: string;
}

export interface Notification {
  id: string;
  userId?: string; // Null if for all users (e.g. Rate Updates)
  message: string;
  type: 'INFO' | 'WARNING' | 'ALERT';
  read: boolean;
  createdAt: string;
}

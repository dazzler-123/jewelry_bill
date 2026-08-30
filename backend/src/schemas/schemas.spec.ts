import mongoose from 'mongoose';
import { model } from 'mongoose';

// Import Schemas
import { User, UserSchema } from './user.schema';
import { Customer, CustomerSchema } from './customer.schema';
import { Product, ProductSchema } from './product.schema';
import { InventoryItem, InventoryItemSchema } from './inventory-item.schema';
import { Bill, BillSchema } from './bill.schema';
import { Payment, PaymentSchema } from './payment.schema';
import { BillRevision, BillRevisionSchema } from './bill-revision.schema';
import { Refund, RefundSchema } from './refund.schema';
import { Return, ReturnSchema } from './return.schema';
import { MetalRate, MetalRateSchema } from './metal-rate.schema';
import { ShopSettings, ShopSettingsSchema } from './shop-settings.schema';
import { AuditLog, AuditLogSchema } from './audit-log.schema';
import { Notification, NotificationSchema } from './notification.schema';

describe('Mongoose Schemas Validation Tests', () => {
  // Compile Mongoose models from schemas statically for validation testing
  const UserModel = model<User>('UserTest', UserSchema);
  const CustomerModel = model<Customer>('CustomerTest', CustomerSchema);
  const ProductModel = model<Product>('ProductTest', ProductSchema);
  const InventoryItemModel = model<InventoryItem>(
    'InventoryItemTest',
    InventoryItemSchema,
  );
  const BillModel = model<Bill>('BillTest', BillSchema);
  const PaymentModel = model<Payment>('PaymentTest', PaymentSchema);
  const BillRevisionModel = model<BillRevision>(
    'BillRevisionTest',
    BillRevisionSchema,
  );
  const RefundModel = model<Refund>('RefundTest', RefundSchema);
  const ReturnModel = model<Return>('ReturnTest', ReturnSchema);
  const MetalRateModel = model<MetalRate>('MetalRateTest', MetalRateSchema);
  const ShopSettingsModel = model<ShopSettings>(
    'ShopSettingsTest',
    ShopSettingsSchema,
  );
  const AuditLogModel = model<AuditLog>('AuditLogTest', AuditLogSchema);
  const NotificationModel = model<Notification>(
    'NotificationTest',
    NotificationSchema,
  );

  describe('User Validation', () => {
    it('should validate a correct user model', async () => {
      const u = new UserModel({
        name: 'John Doe',
        email: 'john@example.com',
        passwordHash: 'hashedpassword123',
        role: 'CASHIER',
        isActive: true,
      });
      await expect(u.validate()).resolves.toBeUndefined();
    });

    it('should fail if required fields are missing', async () => {
      const u = new UserModel({});
      await expect(u.validate()).rejects.toThrow();
    });

    it('should fail with invalid role enum', async () => {
      const u = new UserModel({
        name: 'John Doe',
        email: 'john@example.com',
        passwordHash: 'hashed123',
        role: 'SUPERADMIN', // Invalid
      });
      await expect(u.validate()).rejects.toThrow();
    });
  });

  describe('Customer Validation', () => {
    it('should validate a correct customer model', async () => {
      const c = new CustomerModel({
        customerCode: 'CUST-0001',
        name: 'Amit Patel',
        phone: '9876543210',
      });
      await expect(c.validate()).resolves.toBeUndefined();
    });

    it('should fail if name or phone or customerCode is missing', async () => {
      const c = new CustomerModel({
        name: 'Amit Patel',
      });
      await expect(c.validate()).rejects.toThrow();
    });
  });

  describe('Product Validation', () => {
    it('should validate a correct product model', async () => {
      const p = new ProductModel({
        sku: 'RING-GLD-22K-001',
        barcode: '12345678',
        name: 'Classic Gold Ring',
        category: 'Ring',
        metal: 'GOLD',
        purity: '22K',
      });
      await expect(p.validate()).resolves.toBeUndefined();
    });

    it('should fail if metal is invalid enum', async () => {
      const p = new ProductModel({
        sku: 'RING-GLD-22K-001',
        barcode: '12345678',
        name: 'Classic Gold Ring',
        category: 'Ring',
        metal: 'BRONZE', // Invalid
        purity: '22K',
      });
      await expect(p.validate()).rejects.toThrow();
    });
  });

  describe('InventoryItem Validation', () => {
    it('should calculate netWeight automatically and validate correctly', async () => {
      const productId = new mongoose.Types.ObjectId();
      const item = new InventoryItemModel({
        productId,
        sku: 'RNG001',
        barcode: 'BCODE01',
        metal: 'GOLD',
        purity: '22K',
        grossWeight: 10.5,
        stoneWeight: 1.5,
        otherWeight: 0.5,
        status: 'IN_STOCK',
      });
      await expect(item.validate()).resolves.toBeUndefined();
      expect(item.netWeight).toBe(8.5); // 10.5 - 1.5 - 0.5
    });

    it('should fail if weights or amounts are negative', async () => {
      const productId = new mongoose.Types.ObjectId();
      const item = new InventoryItemModel({
        productId,
        sku: 'RNG001',
        barcode: 'BCODE01',
        metal: 'GOLD',
        purity: '22K',
        grossWeight: -10.5, // Invalid
        purchasePrice: -100, // Invalid
      });
      await expect(item.validate()).rejects.toThrow();
    });

    it('should fail if status is invalid enum', async () => {
      const productId = new mongoose.Types.ObjectId();
      const item = new InventoryItemModel({
        productId,
        sku: 'RNG001',
        barcode: 'BCODE01',
        metal: 'GOLD',
        purity: '22K',
        grossWeight: 10.5,
        status: 'BROKEN', // Invalid
      });
      await expect(item.validate()).rejects.toThrow();
    });
  });

  describe('Bill & BillItem Validation', () => {
    it('should calculate item netWeight & metalValue and validate correct bill structure', async () => {
      const customerId = new mongoose.Types.ObjectId();
      const userId = new mongoose.Types.ObjectId();
      const b = new BillModel({
        invoiceNumber: 'INV-2026-0001',
        customerSnapshot: {
          customerId,
          customerCode: 'CUST-0001',
          name: 'Amit Patel',
          phone: '9876543210',
        },
        itemsSnapshot: [
          {
            productName: 'Plain Band',
            sku: 'BAND-1',
            metal: 'GOLD',
            purity: '22K',
            grossWeight: 5.0,
            stoneWeight: 0.0,
            otherWeight: 0.0,
            metalRate: 7500,
            makingChargeType: 'PER_GRAM',
            makingChargeRate: 500,
            makingChargeAmount: 2500,
            taxableAmount: 40000,
            tax: 1200,
            finalAmount: 41200,
          },
        ],
        rateSnapshot: {
          rates: [{ metalType: 'GOLD', purity: '22K', ratePerGram: 7500 }],
        },
        pricingSnapshot: {
          subtotal: 37500,
          makingChargesTotal: 2500,
          wastageChargesTotal: 0,
          stoneChargesTotal: 0,
          otherChargesTotal: 0,
          discountAmount: 0,
          taxableAmount: 40000,
          taxAmount: 1200,
          finalAmount: 41200,
        },
        paymentSummary: {
          paidAmount: 0,
          outstandingAmount: 41200,
        },
        status: 'UNPAID',
        dueDate: new Date(),
        createdBy: userId,
      });

      await expect(b.validate()).resolves.toBeUndefined();
      expect(b.itemsSnapshot[0].netWeight).toBe(5.0);
      expect(b.itemsSnapshot[0].metalValue).toBe(37500); // 5.0 * 7500
    });

    it('should fail with invalid bill status', async () => {
      const b = new BillModel({
        invoiceNumber: 'INV-2026-0001',
        status: 'COMPLETED', // Invalid
      });
      await expect(b.validate()).rejects.toThrow();
    });
  });

  describe('Payment Validation', () => {
    it('should validate a correct payment', async () => {
      const billId = new mongoose.Types.ObjectId();
      const customerId = new mongoose.Types.ObjectId();
      const userId = new mongoose.Types.ObjectId();
      const p = new PaymentModel({
        paymentId: 'TXN-0001',
        billId,
        customerId,
        amount: 5000,
        method: 'UPI',
        createdBy: userId,
      });
      await expect(p.validate()).resolves.toBeUndefined();
    });

    it('should fail if amount is negative or method is invalid', async () => {
      const billId = new mongoose.Types.ObjectId();
      const customerId = new mongoose.Types.ObjectId();
      const userId = new mongoose.Types.ObjectId();
      const p = new PaymentModel({
        paymentId: 'TXN-0001',
        billId,
        customerId,
        amount: -500, // Invalid
        method: 'BITCOIN', // Invalid
        createdBy: userId,
      });
      await expect(p.validate()).rejects.toThrow();
    });
  });

  describe('ShopSettings Validation', () => {
    it('should validate standard shop settings', async () => {
      const s = new ShopSettingsModel({
        name: 'Gems & Gold Shop',
        address: '123 Jewel Street',
        phone: '1234567890',
        invoicePrefix: 'INV-TEST-',
      });
      await expect(s.validate()).resolves.toBeUndefined();
    });
  });

  describe('MetalRate Validation', () => {
    it('should fail if metalType is invalid enum or rate is negative', async () => {
      const userId = new mongoose.Types.ObjectId();
      const rate = new MetalRateModel({
        metalType: 'BRONZE', // Invalid
        purity: '10K',
        ratePerGram: -100, // Invalid
        updatedBy: userId,
      });
      await expect(rate.validate()).rejects.toThrow();
    });
  });

  describe('AuditLog Validation', () => {
    it('should validate a normal audit log', async () => {
      const userId = new mongoose.Types.ObjectId();
      const entityId = new mongoose.Types.ObjectId();
      const log = new AuditLogModel({
        userId,
        action: 'BILL_CREATE',
        entityType: 'Bill',
        entityId,
      });
      await expect(log.validate()).resolves.toBeUndefined();
    });
  });

  describe('BillRevision Validation', () => {
    it('should validate a correct bill revision', async () => {
      const billId = new mongoose.Types.ObjectId();
      const userId = new mongoose.Types.ObjectId();
      const rev = new BillRevisionModel({
        billId,
        version: 1,
        previousData: { status: 'DRAFT' },
        newData: { status: 'UNPAID' },
        changedFields: ['status'],
        reason: 'Client requested invoice posting',
        changedBy: userId,
      });
      await expect(rev.validate()).resolves.toBeUndefined();
    });
  });

  describe('Refund Validation', () => {
    it('should validate a correct refund', async () => {
      const billId = new mongoose.Types.ObjectId();
      const userId = new mongoose.Types.ObjectId();
      const ref = new RefundModel({
        refundId: 'REF-0001',
        billId,
        amount: 2500,
        method: 'UPI',
        reason: 'Item returned due to defect',
        processedBy: userId,
      });
      await expect(ref.validate()).resolves.toBeUndefined();
    });
  });

  describe('Return Validation', () => {
    it('should validate a correct return', async () => {
      const billId = new mongoose.Types.ObjectId();
      const userId = new mongoose.Types.ObjectId();
      const ret = new ReturnModel({
        returnId: 'RET-0001',
        billId,
        items: [
          {
            name: 'Damaged chain',
            weight: 4.5,
            value: 28000,
          },
        ],
        processedBy: userId,
      });
      await expect(ret.validate()).resolves.toBeUndefined();
    });
  });

  describe('Notification Validation', () => {
    it('should validate a correct notification', async () => {
      const userId = new mongoose.Types.ObjectId();
      const n = new NotificationModel({
        userId,
        message: 'Daily gold rate updated successfully',
        type: 'INFO',
      });
      await expect(n.validate()).resolves.toBeUndefined();
    });
  });

  describe('Indexes Verification', () => {
    it('should define all requested indexes on schemas', () => {
      // Check customer unique indexes
      const customerIndexes = CustomerSchema.indexes();
      const customerUniqueCode = customerIndexes.some(
        (idx) => idx[0]['customerCode'] === 1 && idx[1]?.unique === true,
      );
      const customerUniquePhone = customerIndexes.some(
        (idx) => idx[0]['phone'] === 1 && idx[1]?.unique === true,
      );
      const customerIndexName = customerIndexes.some(
        (idx) => idx[0]['name'] === 1,
      );
      expect(customerUniqueCode).toBe(true);
      expect(customerUniquePhone).toBe(true);
      expect(customerIndexName).toBe(true);

      // Check product unique index on SKU
      const productIndexes = ProductSchema.indexes();
      const productUniqueSku = productIndexes.some(
        (idx) => idx[0]['sku'] === 1 && idx[1]?.unique === true,
      );
      expect(productUniqueSku).toBe(true);

      // Check metal rate compound unique index
      const rateIndexes = MetalRateSchema.indexes();
      const rateCompoundIndex = rateIndexes.some(
        (idx) =>
          idx[0]['metalType'] === 1 &&
          idx[0]['purity'] === 1 &&
          idx[1]?.unique === true,
      );
      expect(rateCompoundIndex).toBe(true);
    });
  });
});

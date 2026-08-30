import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { BillsController } from './bills.controller';
import { Bill } from '../schemas/bill.schema';
import { Customer } from '../schemas/customer.schema';
import { InventoryItem } from '../schemas/inventory-item.schema';
import { Payment } from '../schemas/payment.schema';
import { MetalRate } from '../schemas/metal-rate.schema';
import { ShopSettings } from '../schemas/shop-settings.schema';
import { AuditLog } from '../schemas/audit-log.schema';
import { BillRevision } from '../schemas/bill-revision.schema';
import { Return } from '../schemas/return.schema';
import { Refund } from '../schemas/refund.schema';
import { InventoryHistory } from '../schemas/inventory-history.schema';

describe('BillsController Integration', () => {
  let controller: BillsController;

  // Mock models
  let billModelMock: any;
  let customerModelMock: any;
  let inventoryModelMock: any;
  let paymentModelMock: any;
  let metalRateModelMock: any;
  let settingsModelMock: any;
  let auditModelMock: any;
  let revisionModelMock: any;
  let returnModelMock: any;
  let refundModelMock: any;

  const mockUserRequest = {
    user: {
      sub: '507f1f77bcf86cd799439011',
      email: 'cashier@aurum.com',
      role: 'CASHIER',
    },
  };

  beforeEach(async () => {
    billModelMock = {
      find: jest.fn().mockReturnThis(),
      findById: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      create: jest.fn(),
      countDocuments: jest.fn().mockResolvedValue(10),
      populate: jest.fn().mockResolvedValue([]),
    };

    customerModelMock = {
      find: jest.fn().mockReturnThis(),
      findOne: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    };

    inventoryModelMock = {
      findOne: jest.fn(),
      findById: jest.fn(),
      findOneAndUpdate: jest.fn().mockImplementation(async (query, update) => {
        const findOneResult = await inventoryModelMock.findOne();
        const status = update?.$set?.status || 'SOLD';
        if (findOneResult) {
          findOneResult.status = status;
          return findOneResult;
        }
        return {
          _id: query._id || new Types.ObjectId('507f1f77bcf86cd799439099'),
          barcode: query.barcode || 'BAR-1001',
          status: status,
          save: jest.fn(),
        };
      }),
    };

    paymentModelMock = {
      create: jest.fn(),
      countDocuments: jest.fn().mockResolvedValue(2),
      updateMany: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    };

    metalRateModelMock = {
      aggregate: jest.fn().mockResolvedValue([
        { _id: { metalType: 'GOLD', purity: '22K' }, ratePerGram: 7000 },
        { _id: { metalType: 'SILVER', purity: '999' }, ratePerGram: 90 },
      ]),
    };

    settingsModelMock = {
      findOne: jest.fn().mockResolvedValue({ invoicePrefix: 'INV-2026-' }),
    };

    auditModelMock = {
      create: jest.fn(),
    };

    revisionModelMock = {
      countDocuments: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
      find: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValue([]),
    };

    returnModelMock = {
      countDocuments: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
    };

    refundModelMock = {
      countDocuments: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BillsController],
      providers: [
        {
          provide: JwtService,
          useValue: {
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: getModelToken(Bill.name),
          useValue: billModelMock,
        },
        {
          provide: getModelToken(Customer.name),
          useValue: customerModelMock,
        },
        {
          provide: getModelToken(InventoryItem.name),
          useValue: inventoryModelMock,
        },
        {
          provide: getModelToken(Payment.name),
          useValue: paymentModelMock,
        },
        {
          provide: getModelToken(MetalRate.name),
          useValue: metalRateModelMock,
        },
        {
          provide: getModelToken(ShopSettings.name),
          useValue: settingsModelMock,
        },
        {
          provide: getModelToken(AuditLog.name),
          useValue: auditModelMock,
        },
        {
          provide: getModelToken(BillRevision.name),
          useValue: revisionModelMock,
        },
        {
          provide: getModelToken(Return.name),
          useValue: returnModelMock,
        },
        {
          provide: getModelToken(Refund.name),
          useValue: refundModelMock,
        },
        {
          provide: getModelToken(InventoryHistory.name),
          useValue: { create: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<BillsController>(BillsController);
  });

  describe('Post Bill Creation', () => {
    it('should throw BadRequestException if items list is empty', async () => {
      const dto = {
        customerId: '507f1f77bcf86cd799439022',
        items: [],
        payments: [],
        dueDate: '2026-09-27T00:00:00Z',
      };
      await expect(controller.create(dto, mockUserRequest)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if customerId and newCustomer are both missing', async () => {
      const dto = {
        items: [{ productName: 'Gold Ring', metal: 'GOLD', purity: '22K', grossWeight: 10, metalRate: 7000, makingChargeType: 'FIXED', makingChargeRate: 1000, wastageType: 'NONE', wastageRate: 0 }],
        payments: [],
        dueDate: '2026-09-27T00:00:00Z',
      };
      await expect(controller.create(dto, mockUserRequest)).rejects.toThrow(BadRequestException);
    });

    it('should create bill for existing customer with one item and no payment', async () => {
      const customerId = '507f1f77bcf86cd799439022';
      customerModelMock.findById.mockResolvedValue({
        _id: new Types.ObjectId(customerId),
        customerCode: 'CUST-0001',
        name: 'John Doe',
        phone: '9876543210',
      });

      billModelMock.create.mockImplementation((billData) => ({
        ...billData,
        _id: new Types.ObjectId('507f1f77bcf86cd799439033'),
        toJSON: () => billData,
      }));

      const mockQuery = {
        populate: jest.fn().mockResolvedValue({
          invoiceNumber: 'INV-2026-0011',
          status: 'UNPAID',
          paymentSummary: { paidAmount: 0, outstandingAmount: 73130 },
        }),
      };
      billModelMock.findById.mockReturnValue(mockQuery);

      const dto = {
        customerId,
        items: [
          {
            productName: 'Gold Ring',
            metal: 'GOLD',
            purity: '22K',
            grossWeight: 10,
            metalRate: 7000,
            makingChargeType: 'FIXED',
            makingChargeRate: 1000,
            wastageType: 'NONE',
            wastageRate: 0,
          },
        ],
        payments: [],
        dueDate: '2026-09-27T00:00:00Z',
      };

      const result = await controller.create(dto, mockUserRequest);
      expect(result).toBeDefined();
      expect(billModelMock.create).toHaveBeenCalled();
    });

    it('should create bill for new customer with multiple items and full payment', async () => {
      customerModelMock.findOne.mockResolvedValue(null);
      customerModelMock.create.mockResolvedValue({
        _id: new Types.ObjectId('507f1f77bcf86cd799439044'),
        customerCode: 'CUST-5555',
        name: 'Jane Smith',
        phone: '9999988888',
      });

      billModelMock.create.mockImplementation((billData) => ({
        ...billData,
        _id: new Types.ObjectId('507f1f77bcf86cd799439055'),
        toJSON: () => billData,
      }));

      const mockQuery = {
        populate: jest.fn().mockResolvedValue({ status: 'PAID' }),
      };
      billModelMock.findById.mockReturnValue(mockQuery);

      const dto = {
        newCustomer: {
          name: 'Jane Smith',
          phone: '9999988888',
        },
        items: [
          {
            productName: 'Gold Earring',
            metal: 'GOLD',
            purity: '22K',
            grossWeight: 5,
            metalRate: 7000,
            makingChargeType: 'PER_GRAM',
            makingChargeRate: 500,
            wastageType: 'NONE',
            wastageRate: 0,
          },
          {
            productName: 'Silver Chain',
            metal: 'SILVER',
            purity: '999',
            grossWeight: 50,
            metalRate: 90,
            makingChargeType: 'FIXED',
            makingChargeRate: 500,
            wastageType: 'NONE',
            wastageRate: 0,
          },
        ],
        payments: [{ method: 'UPI', amount: 43775 }],
        dueDate: '2026-09-27T00:00:00Z',
      };

      await controller.create(dto, mockUserRequest);
      expect(customerModelMock.create).toHaveBeenCalled();
      expect(paymentModelMock.create).toHaveBeenCalledTimes(1);
    });

    it('should handle partial payment and track due balance', async () => {
      customerModelMock.findById.mockResolvedValue({
        _id: new Types.ObjectId('507f1f77bcf86cd799439022'),
        customerCode: 'CUST-0001',
        name: 'John Doe',
      });

      billModelMock.create.mockImplementation((billData) => ({
        ...billData,
        _id: new Types.ObjectId('507f1f77bcf86cd799439066'),
        toJSON: () => billData,
      }));

      const mockQuery = {
        populate: jest.fn().mockResolvedValue({}),
      };
      billModelMock.findById.mockReturnValue(mockQuery);

      const dto = {
        customerId: '507f1f77bcf86cd799439022',
        items: [
          {
            productName: 'Gold Pendant',
            metal: 'GOLD',
            purity: '22K',
            grossWeight: 10,
            metalRate: 7000,
            makingChargeType: 'FIXED',
            makingChargeRate: 0,
            wastageType: 'NONE',
            wastageRate: 0,
          },
        ],
        payments: [{ method: 'CASH', amount: 30000 }],
        dueDate: '2026-09-27T00:00:00Z',
      };

      await controller.create(dto, mockUserRequest);
      const createdBillPayload = billModelMock.create.mock.calls[0][0];
      expect(createdBillPayload.status).toBe('PARTIALLY_PAID');
      expect(createdBillPayload.paymentSummary.outstandingAmount).toBe(42100);
    });

    it('should support split payment recording across multiple modes', async () => {
      customerModelMock.findById.mockResolvedValue({
        _id: new Types.ObjectId('507f1f77bcf86cd799439022'),
      });

      billModelMock.create.mockImplementation((billData) => ({
        ...billData,
        _id: new Types.ObjectId('507f1f77bcf86cd799439077'),
        toJSON: () => billData,
      }));

      const mockQuery = {
        populate: jest.fn().mockResolvedValue({}),
      };
      billModelMock.findById.mockReturnValue(mockQuery);

      const dto = {
        customerId: '507f1f77bcf86cd799439022',
        items: [
          {
            productName: 'Gold Bangle',
            metal: 'GOLD',
            purity: '22K',
            grossWeight: 20,
            metalRate: 7000,
            makingChargeType: 'FIXED',
            makingChargeRate: 0,
            wastageType: 'NONE',
            wastageRate: 0,
          },
        ],
        payments: [
          { method: 'CASH', amount: 44200 },
          { method: 'UPI', amount: 50000 },
          { method: 'CARD', amount: 50000 },
        ],
        dueDate: '2026-09-27T00:00:00Z',
      };

      await controller.create(dto, mockUserRequest);
      expect(paymentModelMock.create).toHaveBeenCalledTimes(3);
    });

    it('should support item-level discount calculations', async () => {
      customerModelMock.findById.mockResolvedValue({
        _id: new Types.ObjectId('507f1f77bcf86cd799439022'),
      });

      billModelMock.create.mockImplementation((billData) => ({
        ...billData,
        _id: new Types.ObjectId('507f1f77bcf86cd799439077'),
        toJSON: () => billData,
      }));

      const mockQuery = {
        populate: jest.fn().mockResolvedValue({}),
      };
      billModelMock.findById.mockReturnValue(mockQuery);

      const dto = {
        customerId: '507f1f77bcf86cd799439022',
        items: [
          {
            productName: 'Discounted Pendant',
            metal: 'GOLD',
            purity: '22K',
            grossWeight: 10,
            metalRate: 7000,
            makingChargeType: 'FIXED',
            makingChargeRate: 0,
            wastageType: 'NONE',
            wastageRate: 0,
            discountType: 'PERCENTAGE',
            discountRate: 10,
          },
        ],
        payments: [],
        dueDate: '2026-09-27T00:00:00Z',
      };

      await controller.create(dto, mockUserRequest);
      const createdBillPayload = billModelMock.create.mock.calls[0][0];
      expect(createdBillPayload.pricingSnapshot.discountAmount).toBe(7000);
      expect(createdBillPayload.pricingSnapshot.taxableAmount).toBe(63000);
      expect(createdBillPayload.pricingSnapshot.finalAmount).toBe(64890);
    });

    it('should update inventory item status to SOLD and throw error if not in stock', async () => {
      customerModelMock.findById.mockResolvedValue({
        _id: new Types.ObjectId('507f1f77bcf86cd799439022'),
      });

      const mockInvItem = {
        _id: new Types.ObjectId('507f1f77bcf86cd799439099'),
        barcode: 'BAR-1001',
        status: 'IN_STOCK',
        save: jest.fn().mockResolvedValue(true),
      };
      inventoryModelMock.findOne.mockResolvedValue(mockInvItem);

      billModelMock.create.mockImplementation((billData) => ({
        ...billData,
        _id: new Types.ObjectId('507f1f77bcf86cd799439088'),
        toJSON: () => billData,
      }));

      const mockQuery = {
        populate: jest.fn().mockResolvedValue({}),
      };
      billModelMock.findById.mockReturnValue(mockQuery);

      const dto = {
        customerId: '507f1f77bcf86cd799439022',
        items: [
          {
            barcode: 'BAR-1001',
            productName: 'Inventory Gold Ring',
            metal: 'GOLD',
            purity: '22K',
            grossWeight: 10,
            metalRate: 7000,
            makingChargeType: 'FIXED',
            makingChargeRate: 0,
            wastageType: 'NONE',
            wastageRate: 0,
          },
        ],
        payments: [],
        dueDate: '2026-09-27T00:00:00Z',
      };

      await controller.create(dto, mockUserRequest);
      expect(inventoryModelMock.findOne).toHaveBeenCalledWith({ barcode: 'BAR-1001' });
      expect(mockInvItem.status).toBe('SOLD');
    });

    it('should fail if requested inventory item is already SOLD', async () => {
      customerModelMock.findById.mockResolvedValue({
        _id: new Types.ObjectId('507f1f77bcf86cd799439022'),
      });

      const mockInvItem = {
        barcode: 'BAR-1001',
        status: 'SOLD',
      };
      inventoryModelMock.findOne.mockResolvedValue(mockInvItem);

      const dto = {
        customerId: '507f1f77bcf86cd799439022',
        items: [
          {
            barcode: 'BAR-1001',
            productName: 'Inventory Gold Ring',
            metal: 'GOLD',
            purity: '22K',
            grossWeight: 10,
            metalRate: 7000,
            makingChargeType: 'FIXED',
            makingChargeRate: 0,
            wastageType: 'NONE',
            wastageRate: 0,
          },
        ],
        payments: [],
        dueDate: '2026-09-27T00:00:00Z',
      };

      await expect(controller.create(dto, mockUserRequest)).rejects.toThrow(BadRequestException);
    });
  });

  describe('Lifecycle Management — Edit Bill', () => {
    it('should edit unpaid bill and record revision', async () => {
      const mockBill = {
        _id: new Types.ObjectId('507f1f77bcf86cd799439022'),
        invoiceNumber: 'INV-2026-0011',
        dueDate: new Date(Date.now() + 1000000),
        itemsSnapshot: [{ productName: 'Gold Ring', metal: 'GOLD', purity: '22K', grossWeight: 10, metalRate: 7000 }],
        paymentSummary: { paidAmount: 0, outstandingAmount: 72100 },
        pricingSnapshot: { finalAmount: 72100 },
        status: 'UNPAID',
        save: jest.fn().mockResolvedValue(true),
        toJSON: function() { return this; },
      };

      const mockBillWithPopulate = Object.assign(mockBill, {
        populate: jest.fn().mockResolvedValue(mockBill),
      });
      billModelMock.findById.mockReturnValue(mockBillWithPopulate);

      const dto = {
        items: [
          {
            productName: 'Gold Earring',
            metal: 'GOLD',
            purity: '22K',
            grossWeight: 5,
            metalRate: 7000,
            makingChargeType: 'FIXED',
            makingChargeRate: 500,
            wastageType: 'NONE',
            wastageRate: 0,
          },
        ],
        dueDate: '2026-09-27T00:00:00Z',
        editReason: 'Customer changed product selection',
      };

      await controller.editBill('507f1f77bcf86cd799439022', dto, mockUserRequest);
      expect(mockBill.pricingSnapshot.finalAmount).toBe(36565);
      expect(mockBill.paymentSummary.outstandingAmount).toBe(36565);
      expect(revisionModelMock.create).toHaveBeenCalled();
      expect(auditModelMock.create).toHaveBeenCalled();
    });

    it('should edit partially paid bill, preserving payment transactions and adjusting due', async () => {
      const mockBill = {
        _id: new Types.ObjectId('507f1f77bcf86cd799439022'),
        invoiceNumber: 'INV-2026-0011',
        dueDate: new Date(Date.now() + 1000000),
        itemsSnapshot: [{ productName: 'Old Ring', metal: 'GOLD', purity: '22K', grossWeight: 20, metalRate: 7000 }],
        paymentSummary: { paidAmount: 80000, outstandingAmount: 64200 },
        pricingSnapshot: { finalAmount: 144200 },
        status: 'PARTIALLY_PAID',
        save: jest.fn().mockResolvedValue(true),
        toJSON: function() { return this; },
      };

      const mockBillWithPopulate = Object.assign(mockBill, {
        populate: jest.fn().mockResolvedValue(mockBill),
      });
      billModelMock.findById.mockReturnValue(mockBillWithPopulate);

      const dto = {
        items: [
          {
            productName: 'New Ring',
            metal: 'GOLD',
            purity: '22K',
            grossWeight: 15,
            metalRate: 7000,
            makingChargeType: 'FIXED',
            makingChargeRate: 0,
            wastageType: 'NONE',
            wastageRate: 0,
          },
        ],
        dueDate: '2026-09-27T00:00:00Z',
        editReason: 'Customer selected cheaper ring weight',
      };

      await controller.editBill('507f1f77bcf86cd799439022', dto, mockUserRequest);
      expect(mockBill.pricingSnapshot.finalAmount).toBe(108150);
      expect(mockBill.paymentSummary.paidAmount).toBe(80000);
      expect(mockBill.paymentSummary.outstandingAmount).toBe(28150);
      expect(mockBill.status).toBe('PARTIALLY_PAID');
    });
  });

  describe('Lifecycle Management — Cancel Bill', () => {
    it('should throw BadRequestException if cancel reason is missing', async () => {
      await expect(controller.cancelBill('507f1f77bcf86cd799439022', { reason: '' }, mockUserRequest))
        .rejects.toThrow(BadRequestException);
    });

    it('should cancel active bill, restore inventory item status, and void payment entries', async () => {
      const mockBill = {
        _id: new Types.ObjectId('507f1f77bcf86cd799439022'),
        status: 'PAID',
        itemsSnapshot: [{ barcode: 'BAR-001', sku: 'SKU-001' }],
        paymentSummary: { paidAmount: 5000, outstandingAmount: 0 },
        save: jest.fn().mockResolvedValue(true),
        toJSON: function() { return this; },
      };
      billModelMock.findById.mockResolvedValue(mockBill);

      const mockInvItem = {
        barcode: 'BAR-001',
        status: 'SOLD',
        save: jest.fn().mockResolvedValue(true),
      };
      inventoryModelMock.findOne.mockResolvedValue(mockInvItem);

      await controller.cancelBill('507f1f77bcf86cd799439022', { reason: 'Incorrect customer name' }, mockUserRequest);
      expect(mockBill.status).toBe('CANCELLED');
      expect(mockInvItem.status).toBe('IN_STOCK');
      expect(paymentModelMock.updateMany).toHaveBeenCalledWith(
        { billId: mockBill._id, status: { $ne: 'FAILED' } },
        expect.anything()
      );
      expect(auditModelMock.create).toHaveBeenCalled();
    });
  });

  describe('Lifecycle Management — Returns & Refunds', () => {
    it('should process partial item returns, restore inventory, and write separate refund logs', async () => {
      const mockBill = {
        _id: new Types.ObjectId('507f1f77bcf86cd799439022'),
        dueDate: new Date(Date.now() + 1000000),
        itemsSnapshot: [{ barcode: 'BAR-999', name: 'Earrings', sku: 'E-01' }],
        pricingSnapshot: { finalAmount: 50000 },
        paymentSummary: { paidAmount: 50000, outstandingAmount: 0 },
        save: jest.fn().mockResolvedValue(true),
        toJSON: function() { return this; },
      };
      billModelMock.findById.mockResolvedValue(mockBill);

      const mockInvItem = {
        barcode: 'BAR-999',
        status: 'SOLD',
        save: jest.fn().mockResolvedValue(true),
      };
      inventoryModelMock.findById.mockResolvedValue(mockInvItem);

      const dto = {
        items: [
          {
            inventoryItemId: '507f1f77bcf86cd799439099',
            sku: 'E-01',
            name: 'Earrings',
            weight: 3,
            value: 20000,
          },
        ],
        reason: 'Customer requested refund',
        refundMethod: 'CASH',
        refundAmount: 20000,
      };

      const result = await controller.returnBillItems('507f1f77bcf86cd799439022', dto, mockUserRequest);
      expect(result.success).toBe(true);
      expect(mockInvItem.status).toBe('RETURNED');
      expect(refundModelMock.create).toHaveBeenCalled();

      expect(mockBill.pricingSnapshot.finalAmount).toBe(30000);
      expect(mockBill.paymentSummary.paidAmount).toBe(30000);
      expect(mockBill.paymentSummary.outstandingAmount).toBe(0);
      expect(mockBill.status).toBe('PAID');
    });
  });
});

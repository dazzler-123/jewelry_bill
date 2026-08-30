import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
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

describe('BillsController Duplicate Sale & Inventory History Tests', () => {
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
  let historyModelMock: any;

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
      findById: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
    };

    inventoryModelMock = {
      findOne: jest.fn(),
      findById: jest.fn(),
      findOneAndUpdate: jest.fn(),
    };

    paymentModelMock = {
      create: jest.fn(),
      countDocuments: jest.fn().mockResolvedValue(2),
    };

    metalRateModelMock = {
      aggregate: jest.fn().mockResolvedValue([
        { _id: { metalType: 'GOLD', purity: '22K' }, ratePerGram: 7000 },
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
    };

    returnModelMock = {
      countDocuments: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
    };

    refundModelMock = {
      countDocuments: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
    };

    historyModelMock = {
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BillsController],
      providers: [
        {
          provide: JwtService,
          useValue: { verifyAsync: jest.fn() },
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
          useValue: historyModelMock,
        },
      ],
    }).compile();

    controller = module.get<BillsController>(BillsController);
  });

  describe('Duplicate Sale Prevention', () => {
    it('should throw BadRequestException if item is already sold or no longer IN_STOCK during bill creation', async () => {
      // Mock existing customer
      customerModelMock.findById.mockResolvedValue({
        _id: new Types.ObjectId('507f1f77bcf86cd799439022'),
        customerCode: 'CUST-0001',
        name: 'John Doe',
        phone: '9876543210',
      });

      // Mock item barcode search in validation phase (claims to be IN_STOCK initially)
      const mockInvItem = {
        _id: new Types.ObjectId('507f1f77bcf86cd799439099'),
        barcode: 'BAR-DUP-01',
        status: 'IN_STOCK',
      };
      inventoryModelMock.findOne.mockResolvedValue(mockInvItem);

      // BUT when update is performed, simulate concurrent checkout where status is no longer IN_STOCK
      inventoryModelMock.findOneAndUpdate.mockResolvedValue(null);

      const billDto = {
        customerId: '507f1f77bcf86cd799439022',
        items: [
          {
            barcode: 'BAR-DUP-01',
            productName: 'Gold Ring',
            sku: 'SKU-01',
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

      await expect(controller.create(billDto, mockUserRequest)).rejects.toThrow(
        new BadRequestException('Inventory item BAR-DUP-01 was already sold or is no longer in stock')
      );

      // Verify that status update failed and no history log was written for this item
      expect(historyModelMock.create).not.toHaveBeenCalled();
    });

    it('should write trace history logs on successful checkout', async () => {
      // Mock existing customer
      customerModelMock.findById.mockResolvedValue({
        _id: new Types.ObjectId('507f1f77bcf86cd799439022'),
        customerCode: 'CUST-0001',
        name: 'John Doe',
        phone: '9876543210',
      });

      const mockInvItem = {
        _id: new Types.ObjectId('507f1f77bcf86cd799439099'),
        barcode: 'BAR-OK-01',
        status: 'IN_STOCK',
      };
      inventoryModelMock.findOne.mockResolvedValue(mockInvItem);
      inventoryModelMock.findOneAndUpdate.mockResolvedValue(mockInvItem);

      const mockBill = {
        _id: new Types.ObjectId('507f1f77bcf86cd799439055'),
        invoiceNumber: 'INV-2026-0001',
        toJSON: () => ({ _id: '507f1f77bcf86cd799439055' }),
      };
      billModelMock.create.mockResolvedValue(mockBill);

      const mockQuery = {
        populate: jest.fn().mockResolvedValue({
          invoiceNumber: 'INV-2026-0001',
          status: 'UNPAID',
          paymentSummary: { paidAmount: 0, outstandingAmount: 73130 },
        }),
      };
      billModelMock.findById.mockReturnValue(mockQuery);

      const billDto = {
        customerId: '507f1f77bcf86cd799439022',
        items: [
          {
            barcode: 'BAR-OK-01',
            productName: 'Gold Ring',
            sku: 'SKU-01',
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

      await controller.create(billDto, mockUserRequest);

      // Verify that status history was created correctly
      expect(historyModelMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          itemId: mockInvItem._id,
          previousStatus: 'IN_STOCK',
          newStatus: 'SOLD',
          reason: 'Sold via Invoice INV-2026-0001',
          userId: new Types.ObjectId(mockUserRequest.user.sub),
          billId: mockBill._id,
        })
      );
    });
  });

  describe('Item Return & History Trace', () => {
    it('should set status to RETURNED and log trace movement when item returned', async () => {
      const mockBill = {
        _id: new Types.ObjectId('507f1f77bcf86cd799439055'),
        invoiceNumber: 'INV-2026-0001',
        dueDate: new Date(Date.now() + 100000),
        itemsSnapshot: [{ barcode: 'BAR-RET-01', name: 'Earrings', sku: 'E-01' }],
        pricingSnapshot: { finalAmount: 50000 },
        paymentSummary: { paidAmount: 50000, outstandingAmount: 0 },
        save: jest.fn().mockResolvedValue(true),
        toJSON: function() { return this; },
      };
      billModelMock.findById.mockResolvedValue(mockBill);

      const mockInvItem = {
        _id: new Types.ObjectId('507f1f77bcf86cd799439099'),
        barcode: 'BAR-RET-01',
        status: 'SOLD',
        save: jest.fn().mockResolvedValue(true),
      };
      inventoryModelMock.findById.mockResolvedValue(mockInvItem);

      const returnDto = {
        items: [
          {
            inventoryItemId: '507f1f77bcf86cd799439099',
            sku: 'E-01',
            name: 'Earrings',
            weight: 3,
            value: 20000,
          },
        ],
        reason: 'Customer disliked weight',
        refundMethod: 'CASH',
        refundAmount: 20000,
      };

      const result = await controller.returnBillItems('507f1f77bcf86cd799439055', returnDto, mockUserRequest);
      expect(result.success).toBe(true);
      expect(mockInvItem.status).toBe('RETURNED');
      expect(mockInvItem.save).toHaveBeenCalled();

      // Check history logging
      expect(historyModelMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          itemId: mockInvItem._id,
          previousStatus: 'SOLD',
          newStatus: 'RETURNED',
          reason: 'Returned from Invoice INV-2026-0001: Customer disliked weight',
          userId: new Types.ObjectId(mockUserRequest.user.sub),
          billId: mockBill._id,
        })
      );
    });
  });
});

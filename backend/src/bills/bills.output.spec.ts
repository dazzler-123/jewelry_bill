import { Test, TestingModule } from '@nestjs/testing';
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

describe('BillsController Output & Settings Integration', () => {
  let controller: BillsController;

  // Mock models
  let billModelMock: any;
  let settingsModelMock: any;
  let auditModelMock: any;

  beforeEach(async () => {
    billModelMock = {
      findById: jest.fn(),
      find: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValue([]),
    };

    settingsModelMock = {
      findOne: jest.fn(),
      create: jest.fn(),
    };

    auditModelMock = {
      create: jest.fn().mockResolvedValue(true),
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
        { provide: getModelToken(Bill.name), useValue: billModelMock },
        { provide: getModelToken(Customer.name), useValue: {} },
        { provide: getModelToken(InventoryItem.name), useValue: {} },
        { provide: getModelToken(Payment.name), useValue: {} },
        { provide: getModelToken(MetalRate.name), useValue: {} },
        { provide: getModelToken(ShopSettings.name), useValue: settingsModelMock },
        { provide: getModelToken(AuditLog.name), useValue: auditModelMock },
        { provide: getModelToken(BillRevision.name), useValue: {} },
        { provide: getModelToken(Return.name), useValue: {} },
        { provide: getModelToken(Refund.name), useValue: {} },
        { provide: getModelToken(InventoryHistory.name), useValue: {} },
      ],
    }).compile();

    controller = module.get<BillsController>(BillsController);
  });

  describe('Shop Settings Active Retrieval', () => {
    it('should retrieve existing shop settings in database', async () => {
      const mockSettings = {
        name: 'Aurum Jewelry House',
        address: '102 Gold Palace',
        phone: '9876543210',
        invoicePrefix: 'INV-2026-',
      };

      settingsModelMock.findOne.mockResolvedValue(mockSettings);

      const res = await controller.getSettings();
      expect(res.name).toBe('Aurum Jewelry House');
      expect(res.invoicePrefix).toBe('INV-2026-');
      expect(settingsModelMock.findOne).toHaveBeenCalled();
    });

    it('should create and return default settings if none exist', async () => {
      settingsModelMock.findOne.mockResolvedValue(null);
      settingsModelMock.create.mockImplementation((arg: any) => ({
        ...arg,
        _id: new Types.ObjectId(),
      }));

      const res = await controller.getSettings();
      expect(res.name).toBe('Aurum Jewelry House');
      expect(res.gstin).toBe('27AAAAA1111A1Z1');
      expect(settingsModelMock.create).toHaveBeenCalled();
    });
  });

  describe('Shop Settings Updates', () => {
    it('should save and update existing configurations', async () => {
      const mockSettings = {
        name: 'Aurum Original',
        invoicePrefix: 'INV-OLD-',
        toObject: jest.fn().mockReturnValue({ name: 'Aurum Original' }),
        save: jest.fn().mockResolvedValue(true),
      } as any;

      settingsModelMock.findOne.mockResolvedValue(mockSettings);

      const updatePayload = {
        name: 'Aurum Modified',
        invoicePrefix: 'INV-NEW-',
      };

      const mockReq = { user: { sub: new Types.ObjectId().toString() } };
      const res = await controller.updateSettings(updatePayload, mockReq);
      expect(res.name).toBe('Aurum Modified');
      expect(res.invoicePrefix).toBe('INV-NEW-');
      expect(mockSettings.save).toHaveBeenCalled();
    });
  });

  describe('Invoice Calculations Populated Mapping', () => {
    it('should correctly output populated invoice summaries', async () => {
      const mockBill = {
        _id: new Types.ObjectId(),
        invoiceNumber: 'INV-2026-1001',
        status: 'PARTIALLY_PAID',
        customerSnapshot: { name: 'Alice Customer', phone: '9999999999' },
        pricingSnapshot: { finalAmount: 85000 },
        paymentSummary: { paidAmount: 60000, outstandingAmount: 25000 },
        dueDate: new Date(),
        populate: jest.fn().mockResolvedValue({
          invoiceNumber: 'INV-2026-1001',
          status: 'PARTIALLY_PAID',
          customerSnapshot: { name: 'Alice Customer', phone: '9999999999' },
          pricingSnapshot: { finalAmount: 85000 },
          paymentSummary: { paidAmount: 60000, outstandingAmount: 25000 },
        }),
      };

      billModelMock.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockBill),
      });

      const res = await controller.getOne(mockBill._id.toString());
      expect(res.invoiceNumber).toBe('INV-2026-1001');
      expect(res.pricingSnapshot.finalAmount).toBe(85000);
      expect(res.paymentSummary.paidAmount).toBe(60000);
      expect(res.paymentSummary.outstandingAmount).toBe(25000);
      expect(res.customerSnapshot.name).toBe('Alice Customer');
    });
  });
});

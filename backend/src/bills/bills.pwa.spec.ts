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

describe('BillsController Idempotency & PWA Offline Sync', () => {
  let controller: BillsController;

  // Mock models
  let billModelMock: any;

  beforeEach(async () => {
    billModelMock = {
      findOne: jest.fn(),
      create: jest.fn(),
      countDocuments: jest.fn().mockResolvedValue(1),
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
        { provide: getModelToken(ShopSettings.name), useValue: { findOne: jest.fn().mockResolvedValue(null) } },
        { provide: getModelToken(AuditLog.name), useValue: {} },
        { provide: getModelToken(BillRevision.name), useValue: {} },
        { provide: getModelToken(Return.name), useValue: {} },
        { provide: getModelToken(Refund.name), useValue: {} },
        { provide: getModelToken(InventoryHistory.name), useValue: {} },
      ],
    }).compile();

    controller = module.get<BillsController>(BillsController);
  });

  describe('Idempotent Creations', () => {
    it('should return existing bill and skip creation if clientTxId already exists in database', async () => {
      const mockBill = {
        _id: new Types.ObjectId(),
        invoiceNumber: 'INV-2026-1002',
        clientTxId: 'tx-uuid-1234',
        status: 'PAID',
        pricingSnapshot: { finalAmount: 5000 },
        populate: jest.fn().mockReturnThis(),
      };

      billModelMock.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockBill),
      });

      const payload = {
        items: [{
          productName: 'Gold Pendant',
          grossWeight: 5,
          metalRate: 7000,
          makingChargeType: 'PERCENTAGE',
          makingChargeRate: 0,
          wastageType: 'NONE',
          wastageRate: 0,
          metal: 'GOLD',
          purity: '22K',
        }],
        dueDate: new Date().toISOString(),
        payments: [],
        clientTxId: 'tx-uuid-1234',
      } as any;

      const reqUser = { user: { sub: new Types.ObjectId().toString() } };

      const res = await controller.create(payload, reqUser);

      // Verify findOne is called with clientTxId
      expect(billModelMock.findOne).toHaveBeenCalledWith({ clientTxId: 'tx-uuid-1234' });
      // Verify create is NOT called (idempotency prevents duplicate invoice generation)
      expect(billModelMock.create).not.toHaveBeenCalled();
      expect(res.invoiceNumber).toBe('INV-2026-1002');
    });
  });
});

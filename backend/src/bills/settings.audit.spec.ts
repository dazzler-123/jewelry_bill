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
import { calculateInvoiceItem } from '../services/billing/calculation/calculation.engine';

describe('BillsController Settings Security & Auditing', () => {
  let controller: BillsController;

  // Mock models
  let settingsModelMock: any;
  let auditModelMock: any;

  beforeEach(async () => {
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
        { provide: getModelToken(Bill.name), useValue: {} },
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

  describe('Dynamic Calculations Overriding', () => {
    it('should calculate taxes using custom rates from settings if supplied', () => {
      const calcInput = {
        metal: 'GOLD' as const,
        purity: '22K',
        grossWeight: 10,
        metalRate: 7000,
        makingChargeType: 'PERCENTAGE' as const,
        makingChargeRate: 10, // 7000 making
        wastageType: 'NONE' as const,
        wastageRate: 0,
        stoneChargeType: 'FIXED' as const,
        stoneRate: 0,
      };

      // Intra-state calculations (CGST + SGST)
      // Subtotal = 70000 (metal) + 7000 (making) = 77000.
      // Default: 1.5% CGST (1155), 1.5% SGST (1155) -> 2310
      // Custom Settings taxes: 2.5% CGST, 2.5% SGST -> 5% total (3850)
      const res = calculateInvoiceItem(calcInput, false, { cgst: 2.5, sgst: 2.5, igst: 5.0 });
      expect(res.cgstAmount).toBe(1925); // 77000 * 2.5%
      expect(res.sgstAmount).toBe(1925);
      expect(res.igstAmount).toBe(0);
      expect(res.taxAmount).toBe(3850);
      expect(res.finalAmount).toBe(80850);
    });
  });

  describe('Settings Security Actions Auditing', () => {
    it('should create an AuditLog entry when settings are updated', async () => {
      const mockSettings = {
        _id: new Types.ObjectId(),
        name: 'Aurum House',
        toObject: jest.fn().mockReturnValue({ name: 'Aurum House' }),
        save: jest.fn().mockResolvedValue(true),
      } as any;

      settingsModelMock.findOne.mockResolvedValue(mockSettings);

      const reqUser = { user: { sub: new Types.ObjectId().toString() } };
      const payload = {
        name: 'Aurum Palace',
        cgstRate: 2.5,
        sgstRate: 2.5,
      };

      await controller.updateSettings(payload, reqUser);

      expect(mockSettings.save).toHaveBeenCalled();
      expect(auditModelMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'UPDATE_SETTINGS',
          entityType: 'ShopSettings',
          entityId: mockSettings._id,
        })
      );
    });
  });
});

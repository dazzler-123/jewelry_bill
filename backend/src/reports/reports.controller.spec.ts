import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { ReportsController } from './reports.controller';
import { Bill } from '../schemas/bill.schema';
import { Payment } from '../schemas/payment.schema';
import { Customer } from '../schemas/customer.schema';
import { User } from '../schemas/user.schema';

describe('ReportsController Unit Tests', () => {
  let controller: ReportsController;

  // Mock models
  let billModelMock: any;
  let paymentModelMock: any;
  let customerModelMock: any;
  let userModelMock: any;

  beforeEach(async () => {
    billModelMock = {
      find: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      countDocuments: jest.fn(),
    };

    paymentModelMock = {
      find: jest.fn(),
    };

    customerModelMock = {};
    userModelMock = {};

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [
        {
          provide: JwtService,
          useValue: {
            verifyAsync: jest.fn(),
          },
        },
        { provide: getModelToken(Bill.name), useValue: billModelMock },
        { provide: getModelToken(Payment.name), useValue: paymentModelMock },
        { provide: getModelToken(Customer.name), useValue: customerModelMock },
        { provide: getModelToken(User.name), useValue: userModelMock },
      ],
    }).compile();

    controller = module.get<ReportsController>(ReportsController);
  });

  describe('GET /reports/dashboard', () => {
    it('should aggregate today sales, collections, and active outstanding balances', async () => {
      const mockBillsToday = [
        {
          pricingSnapshot: { finalAmount: 10000 },
          itemsSnapshot: [
            { metal: 'GOLD', netWeight: 1.5 },
            { metal: 'SILVER', netWeight: 20 },
          ],
        },
      ];

      const mockPaymentsToday = [
        { amount: 5000, status: 'SUCCESS' },
      ];

      const mockActiveBills = [
        {
          dueDate: new Date(Date.now() + 86400000 * 5), // due in 5 days
          paymentSummary: { outstandingAmount: 4000 },
        },
        {
          dueDate: new Date(Date.now() - 86400000 * 2), // overdue by 2 days
          paymentSummary: { outstandingAmount: 3000 },
        },
      ];

      // Setup call chains
      billModelMock.find
        .mockImplementationOnce(() => Promise.resolve(mockBillsToday)) // First call for today's bills
        .mockImplementationOnce(() => Promise.resolve(mockActiveBills)); // Second call for active outstanding

      paymentModelMock.find.mockResolvedValue(mockPaymentsToday);

      const res = await controller.getDashboard();
      expect(res.todaySales).toBe(10000);
      expect(res.todayBillsCount).toBe(1);
      expect(res.goldSoldGrams).toBe(1.5);
      expect(res.silverSoldGrams).toBe(20);
      expect(res.todayCollection).toBe(5000);
      expect(res.outstanding).toBe(7000);
      expect(res.overdue).toBe(3000); // Only the second bill is overdue
    });
  });

  describe('GET /reports/gst', () => {
    it('should calculate CGST, SGST, IGST totals and taxable sums correctly', async () => {
      const mockBills = [
        {
          pricingSnapshot: {
            taxableAmount: 10000,
            cgst: 150,
            sgst: 150,
            igst: 0,
          },
        },
        {
          pricingSnapshot: {
            taxableAmount: 20000,
            cgst: 0,
            sgst: 0,
            igst: 600,
          },
        },
      ];

      billModelMock.find.mockResolvedValue(mockBills);

      const res = await controller.getGstReport();
      expect(res.taxableValue).toBe(30000);
      expect(res.cgst).toBe(150);
      expect(res.sgst).toBe(150);
      expect(res.igst).toBe(600);
      expect(res.totalTax).toBe(900);
    });
  });

  describe('GET /reports/payments', () => {
    it('should sum payment amounts grouped by method correctly', async () => {
      const mockPayments = [
        { method: 'CASH', amount: 1000 },
        { method: 'UPI', amount: 2000 },
        { method: 'CARD', amount: 3000 },
        { method: 'BANK_TRANSFER', amount: 4000 },
        { method: 'CHEQUE', amount: 5000 },
      ];

      paymentModelMock.find.mockResolvedValue(mockPayments);

      const res = await controller.getPaymentReport();
      expect(res.cash).toBe(1000);
      expect(res.upi).toBe(2000);
      expect(res.card).toBe(3000);
      expect(res.bank).toBe(4000);
      expect(res.cheque).toBe(5000);
      expect(res.total).toBe(15000);
    });
  });

  describe('GET /reports/metal', () => {
    it('should aggregate metal weights and purity quantities', async () => {
      const mockBills = [
        {
          itemsSnapshot: [
            { metal: 'GOLD', purity: '22K', netWeight: 10 },
            { metal: 'SILVER', purity: '92.5%', netWeight: 100 },
          ],
        },
      ];

      billModelMock.find.mockResolvedValue(mockBills);

      const res = await controller.getMetalReport();
      expect(res.goldQuantity).toBe(1);
      expect(res.goldWeight).toBe(10);
      expect(res.silverQuantity).toBe(1);
      expect(res.silverWeight).toBe(100);
      expect(res.purityBreakdown).toContainEqual({
        purity: 'GOLD-22K',
        quantity: 1,
        weight: 10,
      });
    });
  });
});

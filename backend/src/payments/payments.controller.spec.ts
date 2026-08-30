import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { PaymentsController } from './payments.controller';
import { Bill } from '../schemas/bill.schema';
import { Payment } from '../schemas/payment.schema';
import { Customer } from '../schemas/customer.schema';
import { Notification } from '../schemas/notification.schema';
import { AuditLog } from '../schemas/audit-log.schema';

describe('PaymentsController Integration', () => {
  let controller: PaymentsController;

  // Mock models
  let billModelMock: any;
  let paymentModelMock: any;
  let customerModelMock: any;
  let notificationModelMock: any;
  let auditModelMock: any;

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
      sort: jest.fn().mockReturnThis(),
      populate: jest.fn().mockResolvedValue([]),
    };

    paymentModelMock = {
      find: jest.fn().mockReturnThis(),
      findById: jest.fn(),
      create: jest.fn(),
      countDocuments: jest.fn().mockResolvedValue(5),
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValue([]),
    };

    customerModelMock = {
      findById: jest.fn(),
    };

    notificationModelMock = {
      create: jest.fn(),
    };

    auditModelMock = {
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
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
          provide: getModelToken(Payment.name),
          useValue: paymentModelMock,
        },
        {
          provide: getModelToken(Customer.name),
          useValue: customerModelMock,
        },
        {
          provide: getModelToken(Notification.name),
          useValue: notificationModelMock,
        },
        {
          provide: getModelToken(AuditLog.name),
          useValue: auditModelMock,
        },
      ],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
  });

  describe('Dues Dashboard Analytics', () => {
    it('should dynamically update overdue bills and calculate summary statistics', async () => {
      // Setup mock bills: one overdue, one due today, one due next week
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 4);

      const mockBills = [
        {
          dueDate: yesterday,
          paymentSummary: { outstandingAmount: 5000 },
        },
        {
          dueDate: startOfToday,
          paymentSummary: { outstandingAmount: 3000 },
        },
        {
          dueDate: nextWeek,
          paymentSummary: { outstandingAmount: 2000 },
        },
      ];
      billModelMock.find.mockResolvedValue(mockBills);

      // Mock payments collected today
      paymentModelMock.find.mockResolvedValue([
        { amount: 1500 },
        { amount: 2500 },
      ]);

      const summary = await controller.getDueSummary();
      expect(billModelMock.updateMany).toHaveBeenCalled(); // Triggered auto OVERDUE status update
      expect(summary.totalOutstanding).toBe(10000); // 5000 + 3000 + 2000
      expect(summary.overdue).toBe(5000);
      expect(summary.dueToday).toBe(3000);
      expect(summary.dueThisWeek).toBe(5000); // Today + next week (4 days away) = 3000 + 2000 = 5000
      expect(summary.collectedToday).toBe(4000); // 1500 + 2500
    });
  });

  describe('Collect Outstanding Payments', () => {
    it('should collect partial payment and transition bill status', async () => {
      const mockBill = {
        _id: new Types.ObjectId('507f1f77bcf86cd799439022'),
        customerSnapshot: { customerId: new Types.ObjectId('507f1f77bcf86cd799439033') },
        dueDate: new Date(Date.now() + 100000), // future
        paymentSummary: { paidAmount: 10000, outstandingAmount: 15000 },
        status: 'PARTIALLY_PAID',
        save: jest.fn().mockResolvedValue(true),
      };
      billModelMock.findById.mockResolvedValue(mockBill);

      paymentModelMock.create.mockImplementation((payData) => ({
        ...payData,
        _id: new Types.ObjectId('507f1f77bcf86cd799439044'),
        toJSON: () => payData,
      }));

      const dto = {
        billId: '507f1f77bcf86cd799439022',
        amount: 5000,
        method: 'UPI',
        notes: 'Partial payment received',
      };

      const result = await controller.collectPayment(dto, mockUserRequest);
      expect(result.success).toBe(true);
      expect(result.oldDue).toBe(15000);
      expect(result.newDue).toBe(10000);

      expect(mockBill.paymentSummary.paidAmount).toBe(15000);
      expect(mockBill.paymentSummary.outstandingAmount).toBe(10000);
      expect(mockBill.status).toBe('PARTIALLY_PAID');
      expect(mockBill.save).toHaveBeenCalled();
      expect(auditModelMock.create).toHaveBeenCalled();
    });

    it('should collect final payment and transition status to PAID', async () => {
      const mockBill = {
        _id: new Types.ObjectId('507f1f77bcf86cd799439022'),
        customerSnapshot: { customerId: new Types.ObjectId('507f1f77bcf86cd799439033') },
        dueDate: new Date(Date.now() + 100000),
        paymentSummary: { paidAmount: 10000, outstandingAmount: 5000 },
        status: 'PARTIALLY_PAID',
        save: jest.fn().mockResolvedValue(true),
      };
      billModelMock.findById.mockResolvedValue(mockBill);

      paymentModelMock.create.mockImplementation((payData) => ({
        ...payData,
        toJSON: () => payData,
      }));

      const dto = {
        billId: '507f1f77bcf86cd799439022',
        amount: 5000,
        method: 'CASH',
      };

      const result = await controller.collectPayment(dto, mockUserRequest);
      expect(result.newDue).toBe(0);
      expect(mockBill.status).toBe('PAID');
      expect(mockBill.paymentSummary.outstandingAmount).toBe(0);
    });

    it('should throw BadRequestException if payment exceeds outstanding amount', async () => {
      const mockBill = {
        paymentSummary: { paidAmount: 10000, outstandingAmount: 5000 },
        status: 'PARTIALLY_PAID',
      };
      billModelMock.findById.mockResolvedValue(mockBill);

      const dto = {
        billId: '507f1f77bcf86cd799439022',
        amount: 6000, // exceeds 5000
        method: 'CASH',
      };

      await expect(controller.collectPayment(dto, mockUserRequest)).rejects.toThrow(BadRequestException);
    });
  });

  describe('Immutable Reversals Preparation', () => {
    it('should reverse a successful payment, roll back bill balances, and increase due', async () => {
      const mockPayment = {
        _id: new Types.ObjectId('507f1f77bcf86cd799439044'),
        billId: new Types.ObjectId('507f1f77bcf86cd799439022'),
        amount: 5000,
        status: 'SUCCESS',
        notes: 'Rent clear payment',
        save: jest.fn().mockResolvedValue(true),
        toJSON: function() { return this; },
      };
      paymentModelMock.findById.mockResolvedValue(mockPayment);

      const mockBill = {
        _id: new Types.ObjectId('507f1f77bcf86cd799439022'),
        dueDate: new Date(Date.now() + 100000),
        paymentSummary: { paidAmount: 15000, outstandingAmount: 10000 },
        status: 'PARTIALLY_PAID',
        save: jest.fn().mockResolvedValue(true),
      };
      billModelMock.findById.mockResolvedValue(mockBill);

      const result = await controller.reversePayment('507f1f77bcf86cd799439044', mockUserRequest);
      expect(result.success).toBe(true);
      expect(mockPayment.status).toBe('FAILED'); // Reversal sets status to failed (never deletes record)
      expect(mockPayment.notes).toContain('[REVERSED]');
      
      expect(mockBill.paymentSummary.paidAmount).toBe(10000); // 15000 - 5000 = 10000
      expect(mockBill.paymentSummary.outstandingAmount).toBe(15000); // 10000 + 5000 = 15000
      expect(mockBill.save).toHaveBeenCalled();
      expect(mockPayment.save).toHaveBeenCalled();
      expect(auditModelMock.create).toHaveBeenCalled();
    });
  });

  describe('Payment Reminders', () => {
    it('should generate reminder and record a notification', async () => {
      const mockBill = {
        invoiceNumber: 'INV-2026-0001',
        dueDate: new Date(),
        paymentSummary: { outstandingAmount: 12000 },
        customerSnapshot: { customerId: new Types.ObjectId('507f1f77bcf86cd799439033') },
      };
      billModelMock.findById.mockResolvedValue(mockBill);

      customerModelMock.findById.mockResolvedValue({
        name: 'Jane Customer',
        phone: '9876543210',
        email: 'jane@gmail.com',
      });

      const res = await controller.sendReminder(
        '507f1f77bcf86cd799439022',
        { channel: 'WHATSAPP' },
        mockUserRequest,
      );

      expect(res.success).toBe(true);
      expect(res.channel).toBe('WHATSAPP');
      expect(res.messageText).toContain('Jane Customer');
      expect(res.messageText).toContain('INV-2026-0001');
      expect(notificationModelMock.create).toHaveBeenCalled(); // Logs notification audit in DB
    });
  });
});

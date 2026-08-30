import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { CustomersController } from './customers.controller';
import { Customer } from '../schemas/customer.schema';
import { Bill } from '../schemas/bill.schema';
import { Payment } from '../schemas/payment.schema';

describe('CustomersController Integration', () => {
  let controller: CustomersController;

  // Mock models
  let customerModelMock: any;
  let billModelMock: any;
  let paymentModelMock: any;

  const mockCustomerId = new Types.ObjectId().toString();

  // Helper to mock mongoose chain queries
  const createQueryMock = (resolvedValue: any) => {
    const query: any = {};
    query.sort = jest.fn().mockReturnValue(query);
    query.limit = jest.fn().mockReturnValue(query);
    query.populate = jest.fn().mockReturnValue(query);
    query.then = jest.fn().mockImplementation((callback) =>
      Promise.resolve(resolvedValue).then(callback)
    );
    return query;
  };

  beforeEach(async () => {
    customerModelMock = {
      find: jest.fn().mockImplementation(() => createQueryMock([])),
      findById: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
    };

    billModelMock = {
      find: jest.fn().mockImplementation(() => createQueryMock([])),
    };

    paymentModelMock = {
      find: jest.fn().mockImplementation(() => createQueryMock([])),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomersController],
      providers: [
        {
          provide: JwtService,
          useValue: {
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: getModelToken(Customer.name),
          useValue: customerModelMock,
        },
        {
          provide: getModelToken(Bill.name),
          useValue: billModelMock,
        },
        {
          provide: getModelToken(Payment.name),
          useValue: paymentModelMock,
        },
      ],
    }).compile();

    controller = module.get<CustomersController>(CustomersController);
  });

  describe('Customer Creation', () => {
    it('should successfully register a customer and generate CUST- code', async () => {
      const dto = {
        name: 'Alice Johnson',
        phone: '9876543210',
        email: 'alice@gmail.com',
      };

      customerModelMock.findOne.mockResolvedValue(null);
      customerModelMock.create.mockImplementation((arg: any) => ({
        _id: new Types.ObjectId(),
        ...arg,
      }));

      const res = await controller.create(dto);
      expect(res.name).toBe('Alice Johnson');
      expect(res.phone).toBe('9876543210');
      expect(res.customerCode).toMatch(/^CUST-\d{4}$/);
      expect(customerModelMock.findOne).toHaveBeenCalledWith({ phone: '9876543210' });
    });

    it('should throw ConflictException if phone number is already registered', async () => {
      const dto = {
        name: 'Duplicate Phone User',
        phone: '9876543210',
      };

      customerModelMock.findOne.mockResolvedValue({ _id: new Types.ObjectId(), name: 'Original Alice' });

      await expect(controller.create(dto)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if name or phone are missing', async () => {
      await expect(controller.create({ name: '', phone: '9876543210' })).rejects.toThrow(BadRequestException);
      await expect(controller.create({ name: 'Alice', phone: '' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('Customer Search & Retrieval', () => {
    it('should return enriched customer objects with financials computed from non-cancelled bills', async () => {
      const mockCustomer = {
        _id: new Types.ObjectId(mockCustomerId),
        name: 'Alice Johnson',
        phone: '9876543210',
        customerCode: 'CUST-1111',
      };

      const mockBills = [
        {
          _id: new Types.ObjectId(),
          createdAt: new Date('2026-08-20T10:00:00Z'),
          pricingSnapshot: { finalAmount: 50000 },
          paymentSummary: { paidAmount: 30000, outstandingAmount: 20000 },
        },
        {
          _id: new Types.ObjectId(),
          createdAt: new Date('2026-08-25T14:30:00Z'),
          pricingSnapshot: { finalAmount: 25000 },
          paymentSummary: { paidAmount: 25000, outstandingAmount: 0 },
        },
      ];

      customerModelMock.find.mockImplementation(() => createQueryMock([mockCustomer]));
      billModelMock.find.mockImplementation(() => createQueryMock(mockBills));

      const res = await controller.getAll();
      expect(res).toHaveLength(1);

      const enriched = res[0];
      expect(enriched.financials.totalPurchase).toBe(75000);
      expect(enriched.financials.totalPaid).toBe(55000);
      expect(enriched.financials.outstanding).toBe(20000);
      expect(enriched.financials.lastPurchase).toEqual(new Date('2026-08-20T10:00:00Z'));
    });

    it('should search customers matching name, phone, or customer code patterns', async () => {
      customerModelMock.find.mockImplementation(() => createQueryMock([]));
      await controller.search('alice');

      expect(customerModelMock.find).toHaveBeenCalledWith({
        $or: [
          { name: { $regex: 'alice', $options: 'i' } },
          { phone: { $regex: 'alice', $options: 'i' } },
          { customerCode: { $regex: 'alice', $options: 'i' } },
        ],
      });
    });
  });

  describe('Customer Profile', () => {
    it('should return profile financials, full bills timeline, and payment ledger', async () => {
      const mockCustomer = {
        _id: new Types.ObjectId(mockCustomerId),
        name: 'Alice Johnson',
        phone: '9876543210',
        customerCode: 'CUST-1111',
        toJSON: function () {
          return this;
        },
      };

      const mockBills = [
        {
          _id: new Types.ObjectId(),
          dueDate: new Date(Date.now() - 86400000), // overdue by 1 day
          pricingSnapshot: { finalAmount: 5000 },
          paymentSummary: { paidAmount: 2000, outstandingAmount: 3000 },
        },
      ];

      const mockPayments = [
        {
          _id: new Types.ObjectId(),
          paymentId: 'PAY-001',
          amount: 2000,
          status: 'SUCCESS',
        },
      ];

      customerModelMock.findById.mockResolvedValue(mockCustomer);
      billModelMock.find.mockImplementation(() => createQueryMock(mockBills));
      paymentModelMock.find.mockImplementation(() => createQueryMock(mockPayments));

      const res = await controller.getOne(mockCustomerId);
      expect(res.name).toBe('Alice Johnson');
      expect(res.financials.totalPurchase).toBe(5000);
      expect(res.financials.totalPaid).toBe(2000);
      expect(res.financials.outstanding).toBe(3000);
      expect(res.financials.overdue).toBe(3000); // due date is past, outstanding > 0
      expect(res.bills).toHaveLength(1);
      expect(res.payments).toHaveLength(1);
    });

    it('should throw NotFoundException if customer does not exist', async () => {
      customerModelMock.findById.mockResolvedValue(null);
      await expect(controller.getOne(mockCustomerId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('Customer Demographics Update', () => {
    it('should allow modifying demographics when fields are valid', async () => {
      const mockCustomer = {
        _id: new Types.ObjectId(mockCustomerId),
        name: 'Alice Original',
        phone: '9876543210',
        customerCode: 'CUST-1111',
        save: jest.fn().mockResolvedValue(true),
      } as any;

      customerModelMock.findById.mockResolvedValue(mockCustomer);

      const updateDto = {
        name: 'Alice Modified',
        phone: '9876543210', // same phone, no clash check
        email: 'newemail@gmail.com',
      };

      const res = await controller.edit(mockCustomerId, updateDto);
      expect(res.name).toBe('Alice Modified');
      expect(res.email).toBe('newemail@gmail.com');
      expect(mockCustomer.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if updating phone to a number owned by another customer', async () => {
      const mockCustomer = {
        _id: new Types.ObjectId(mockCustomerId),
        name: 'Alice Original',
        phone: '9876543210',
      } as any;

      customerModelMock.findById.mockResolvedValue(mockCustomer);
      // Mock findOne to return another customer clash
      customerModelMock.findOne.mockResolvedValue({
        _id: new Types.ObjectId(),
        name: 'Bob Clash',
        phone: '8888888888',
      });

      const updateDto = {
        name: 'Alice',
        phone: '8888888888', // new number clashing with Bob
      };

      await expect(controller.edit(mockCustomerId, updateDto)).rejects.toThrow(ConflictException);
    });
  });
});

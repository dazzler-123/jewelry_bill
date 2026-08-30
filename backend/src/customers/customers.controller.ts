import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Query,
  Param,
  UseGuards,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Customer } from '../schemas/customer.schema';
import { Bill } from '../schemas/bill.schema';
import { Payment } from '../schemas/payment.schema';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { roundMoney } from '../services/billing/calculation/calculation.engine';

interface CreateCustomerDto {
  name: string;
  phone: string;
  alternatePhone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstin?: string;
  notes?: string;
}

@Controller('customers')
@UseGuards(AuthGuard, PermissionsGuard)
export class CustomersController {
  constructor(
    @InjectModel(Customer.name) private customerModel: Model<Customer>,
    @InjectModel(Bill.name) private billModel: Model<Bill>,
    @InjectModel(Payment.name) private paymentModel: Model<Payment>,
  ) {}

  @Get()
  @RequirePermissions('billing.view')
  async getAll() {
    const customers = await this.customerModel.find().sort({ name: 1 });
    return Promise.all(customers.map((cust) => this.getCustomerDetailsEnriched(cust)));
  }

  @Get('search')
  @RequirePermissions('billing.view')
  async search(@Query('query') query?: string) {
    let results;
    if (!query) {
      results = await this.customerModel.find().limit(20).sort({ name: 1 });
    } else {
      const trimmed = query.trim();
      results = await this.customerModel.find({
        $or: [
          { name: { $regex: trimmed, $options: 'i' } },
          { phone: { $regex: trimmed, $options: 'i' } },
          { customerCode: { $regex: trimmed, $options: 'i' } },
        ],
      }).limit(20).sort({ name: 1 });
    }
    return Promise.all(results.map((cust) => this.getCustomerDetailsEnriched(cust)));
  }

  @Get(':id')
  @RequirePermissions('billing.view')
  async getOne(@Param('id') id: string): Promise<any> {
    const customer = await this.customerModel.findById(id);
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const bills = await this.billModel.find({
      'customerSnapshot.customerId': new Types.ObjectId(id),
      status: { $ne: 'CANCELLED' },
    }).sort({ createdAt: -1 });

    const payments = await this.paymentModel.find({
      customerId: new Types.ObjectId(id),
      status: 'SUCCESS',
    }).sort({ createdAt: -1 });

    let totalPurchase = 0;
    let totalPaid = 0;
    let outstanding = 0;
    let overdue = 0;
    const now = new Date();

    bills.forEach((bill) => {
      totalPurchase += bill.pricingSnapshot?.finalAmount || 0;
      totalPaid += bill.paymentSummary?.paidAmount || 0;
      outstanding += bill.paymentSummary?.outstandingAmount || 0;
      if (
        bill.dueDate.getTime() < now.getTime() &&
        (bill.paymentSummary?.outstandingAmount || 0) > 0
      ) {
        overdue += bill.paymentSummary?.outstandingAmount || 0;
      }
    });

    return {
      ...customer.toJSON(),
      financials: {
        totalPurchase: roundMoney(totalPurchase),
        totalPaid: roundMoney(totalPaid),
        outstanding: roundMoney(outstanding),
        overdue: roundMoney(overdue),
      },
      bills,
      payments,
    };
  }

  @Get(':id/outstanding')
  @RequirePermissions('billing.view')
  async getOutstanding(@Param('id') id: string) {
    const customer = await this.customerModel.findById(id);
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    const balance = await this.getCustomerOutstandingBalance(id);
    return { outstandingBalance: balance };
  }

  @Post()
  @RequirePermissions('billing.create')
  async create(@Body() body: CreateCustomerDto) {
    const { name, phone } = body;
    if (!name || !phone) {
      throw new BadRequestException('Name and phone number are required');
    }

    const existing = await this.customerModel.findOne({ phone: phone.trim() });
    if (existing) {
      throw new ConflictException('A customer with this phone number is already registered');
    }

    // Auto-generate code e.g. CUST-8372
    const codeSuffix = Math.floor(1000 + Math.random() * 9000);
    const customerCode = `CUST-${codeSuffix}`;

    const newCustomer = await this.customerModel.create({
      ...body,
      phone: phone.trim(),
      customerCode,
    });

    return newCustomer;
  }

  @Put(':id')
  @RequirePermissions('billing.edit')
  async edit(@Param('id') id: string, @Body() body: CreateCustomerDto) {
    const { name, phone } = body;
    if (!name || !phone) {
      throw new BadRequestException('Name and phone number are required');
    }

    const customer = await this.customerModel.findById(id);
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Check conflict if phone changes
    if (phone.trim() !== customer.phone) {
      const existing = await this.customerModel.findOne({ phone: phone.trim() });
      if (existing) {
        throw new ConflictException('A customer with this phone number is already registered');
      }
    }

    customer.name = name.trim();
    customer.phone = phone.trim();
    customer.alternatePhone = body.alternatePhone;
    customer.email = body.email;
    customer.address = body.address;
    customer.city = body.city;
    customer.state = body.state;
    customer.pincode = body.pincode;
    customer.gstin = body.gstin;
    customer.notes = body.notes;

    await customer.save();
    return customer;
  }

  /**
   * Helper to enrich customer model details with financial and last purchase indicators.
   */
  private async getCustomerDetailsEnriched(cust: any): Promise<any> {
    const id = cust._id.toString();

    // Find all non-cancelled bills
    const bills = await this.billModel.find({
      'customerSnapshot.customerId': cust._id,
      status: { $ne: 'CANCELLED' },
    }).sort({ createdAt: -1 });

    let totalPurchase = 0;
    let totalPaid = 0;
    let outstanding = 0;
    let lastPurchaseDate: Date | null = null;

    if (bills.length > 0) {
      lastPurchaseDate = bills[0].createdAt || null;
      bills.forEach((bill) => {
        totalPurchase += bill.pricingSnapshot?.finalAmount || 0;
        totalPaid += bill.paymentSummary?.paidAmount || 0;
        outstanding += bill.paymentSummary?.outstandingAmount || 0;
      });
    }

    return {
      id,
      _id: cust._id,
      customerCode: cust.customerCode,
      name: cust.name,
      phone: cust.phone,
      alternatePhone: cust.alternatePhone,
      email: cust.email,
      address: cust.address,
      city: cust.city,
      state: cust.state,
      pincode: cust.pincode,
      gstin: cust.gstin,
      notes: cust.notes,
      outstandingBalance: roundMoney(outstanding),
      financials: {
        totalPurchase: roundMoney(totalPurchase),
        totalPaid: roundMoney(totalPaid),
        outstanding: roundMoney(outstanding),
        lastPurchase: lastPurchaseDate,
      },
    };
  }

  /**
   * Helper to sum all outstanding amounts for unpaid/partially paid invoices of a customer.
   */
  private async getCustomerOutstandingBalance(customerId: string): Promise<number> {
    const unpaidBills = await this.billModel.find({
      'customerSnapshot.customerId': customerId,
      status: { $in: ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'] },
    });

    const sum = unpaidBills.reduce((acc, bill) => {
      return acc + (bill.paymentSummary?.outstandingAmount || 0);
    }, 0);

    return Math.round((sum + Number.EPSILON) * 100) / 100;
  }
}

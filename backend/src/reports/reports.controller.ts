import {
  Controller,
  Get,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Bill } from '../schemas/bill.schema';
import { Payment } from '../schemas/payment.schema';
import { Customer } from '../schemas/customer.schema';
import { User } from '../schemas/user.schema';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { roundMoney } from '../services/billing/calculation/calculation.engine';

@Controller('reports')
@UseGuards(AuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(
    @InjectModel(Bill.name) private billModel: Model<Bill>,
    @InjectModel(Payment.name) private paymentModel: Model<Payment>,
    @InjectModel(Customer.name) private customerModel: Model<Customer>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  @Get('dashboard')
  @RequirePermissions('billing.view')
  async getDashboard() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // 1. Fetch Today's Bills
    const billsToday = await this.billModel.find({
      createdAt: { $gte: startOfToday, $lte: endOfToday },
      status: { $ne: 'CANCELLED' },
    });

    let todaySales = 0;
    let goldSoldGrams = 0;
    let silverSoldGrams = 0;

    billsToday.forEach((bill) => {
      todaySales += bill.pricingSnapshot?.finalAmount || 0;
      bill.itemsSnapshot.forEach((item) => {
        if (item.metal === 'GOLD') {
          goldSoldGrams += item.netWeight || 0;
        } else if (item.metal === 'SILVER') {
          silverSoldGrams += item.netWeight || 0;
        }
      });
    });

    // 2. Today's collections
    const paymentsToday = await this.paymentModel.find({
      paymentDate: { $gte: startOfToday, $lte: endOfToday },
      status: 'SUCCESS',
    });
    const todayCollection = paymentsToday.reduce((sum, p) => sum + (p.amount || 0), 0);

    // 3. Outstanding & Overdue dues
    const activeBills = await this.billModel.find({
      status: { $in: ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'] },
      'paymentSummary.outstandingAmount': { $gt: 0 },
    });

    let totalOutstanding = 0;
    let totalOverdue = 0;
    const now = new Date();

    activeBills.forEach((bill) => {
      totalOutstanding += bill.paymentSummary?.outstandingAmount || 0;
      if (bill.dueDate.getTime() < now.getTime()) {
        totalOverdue += bill.paymentSummary?.outstandingAmount || 0;
      }
    });

    return {
      todaySales: roundMoney(todaySales),
      todayBillsCount: billsToday.length,
      goldSoldGrams: Math.round(goldSoldGrams * 1000) / 1000,
      silverSoldGrams: Math.round(silverSoldGrams * 1000) / 1000,
      outstanding: roundMoney(totalOutstanding),
      overdue: roundMoney(totalOverdue),
      todayCollection: roundMoney(todayCollection),
    };
  }

  @Get('sales-chart')
  @RequirePermissions('billing.view')
  async getSalesChart(
    @Query('filter') filter = '7days',
    @Query('startDate') customStart?: string,
    @Query('endDate') customEnd?: string,
  ) {
    let startDate = new Date();
    let interval: 'hour' | 'day' = 'day';

    if (filter === 'today') {
      startDate.setHours(0, 0, 0, 0);
      interval = 'hour';
    } else if (filter === '7days') {
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    } else if (filter === '30days') {
      startDate.setDate(startDate.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
    } else if (filter === '3months') {
      startDate.setDate(startDate.getDate() - 90);
      startDate.setHours(0, 0, 0, 0);
    } else if (filter === 'custom' && customStart) {
      startDate = new Date(customStart);
      startDate.setHours(0, 0, 0, 0);
    } else {
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    }

    let query: any = {
      createdAt: { $gte: startDate },
      status: { $ne: 'CANCELLED' },
    };

    if (filter === 'custom' && customStart && customEnd) {
      const endLimit = new Date(customEnd);
      endLimit.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: startDate, $lte: endLimit };
    }

    const bills = await this.billModel.find(query);
    const chartData: Array<{ label: string; amount: number }> = [];

    if (interval === 'hour') {
      for (let h = 0; h < 24; h++) {
        const hourLabel = `${String(h).padStart(2, '0')}:00`;
        let total = 0;
        bills.forEach((bill) => {
          if (bill.createdAt && bill.createdAt.getHours() === h) {
            total += bill.pricingSnapshot?.finalAmount || 0;
          }
        });
        chartData.push({ label: hourLabel, amount: roundMoney(total) });
      }
    } else {
      const current = new Date(startDate);
      const endLimit = filter === 'custom' && customEnd ? new Date(customEnd) : new Date();
      endLimit.setHours(23, 59, 59, 999);

      while (current.getTime() <= endLimit.getTime()) {
        const dateStr = current.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        const startDay = new Date(current);
        startDay.setHours(0, 0, 0, 0);
        const endDay = new Date(current);
        endDay.setHours(23, 59, 59, 999);

        let total = 0;
        bills.forEach((bill) => {
          const t = bill.createdAt ? bill.createdAt.getTime() : 0;
          if (bill.createdAt && t >= startDay.getTime() && t <= endDay.getTime()) {
            total += bill.pricingSnapshot?.finalAmount || 0;
          }
        });

        chartData.push({ label: dateStr, amount: roundMoney(total) });
        current.setDate(current.getDate() + 1);
      }
    }

    return chartData;
  }

  @Get('sales')
  @RequirePermissions('billing.view')
  async getSalesReport(
    @Query('page') pageStr = '1',
    @Query('limit') limitStr = '20',
    @Query('startDate') startDateStr?: string,
    @Query('endDate') endDateStr?: string,
    @Query('salespersonId') salespersonId?: string,
    @Query('search') search?: string,
  ) {
    const page = Math.max(1, parseInt(pageStr, 10));
    const limit = Math.max(1, parseInt(limitStr, 10));
    const skip = (page - 1) * limit;

    const query: any = { status: { $ne: 'CANCELLED' } };

    if (startDateStr && endDateStr) {
      const start = new Date(startDateStr);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDateStr);
      end.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: start, $lte: end };
    }

    if (salespersonId) {
      query.createdBy = new Types.ObjectId(salespersonId);
    }

    if (search) {
      const trimmed = search.trim();
      query.$or = [
        { invoiceNumber: { $regex: trimmed, $options: 'i' } },
        { 'customerSnapshot.name': { $regex: trimmed, $options: 'i' } },
        { 'customerSnapshot.phone': { $regex: trimmed, $options: 'i' } },
      ];
    }

    const items = await this.billModel
      .find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalCount = await this.billModel.countDocuments(query);
    const allMatching = await this.billModel.find(query);
    
    const sumAmount = allMatching.reduce((acc, b) => acc + (b.pricingSnapshot?.finalAmount || 0), 0);
    const sumPaid = allMatching.reduce((acc, b) => acc + (b.paymentSummary?.paidAmount || 0), 0);

    return {
      items,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      summary: {
        totalSalesAmount: roundMoney(sumAmount),
        totalPaidAmount: roundMoney(sumPaid),
      },
    };
  }

  @Get('metal')
  @RequirePermissions('billing.view')
  async getMetalReport(
    @Query('startDate') startDateStr?: string,
    @Query('endDate') endDateStr?: string,
  ) {
    const query: any = { status: { $ne: 'CANCELLED' } };

    if (startDateStr && endDateStr) {
      const start = new Date(startDateStr);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDateStr);
      end.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: start, $lte: end };
    }

    const bills = await this.billModel.find(query);

    let goldQty = 0;
    let goldWeight = 0;
    let silverQty = 0;
    let silverWeight = 0;
    const purityBreakdown: Record<string, { qty: number; weight: number }> = {};

    bills.forEach((bill) => {
      bill.itemsSnapshot.forEach((item) => {
        const netW = item.netWeight || 0;
        const metalKey = item.metal.toUpperCase();
        const purityKey = `${metalKey}-${item.purity.toUpperCase()}`;

        if (metalKey === 'GOLD') {
          goldQty += 1;
          goldWeight += netW;
        } else if (metalKey === 'SILVER') {
          silverQty += 1;
          silverWeight += netW;
        }

        if (!purityBreakdown[purityKey]) {
          purityBreakdown[purityKey] = { qty: 0, weight: 0 };
        }
        purityBreakdown[purityKey].qty += 1;
        purityBreakdown[purityKey].weight += netW;
      });
    });

    return {
      goldQuantity: goldQty,
      goldWeight: Math.round(goldWeight * 1000) / 1000,
      silverQuantity: silverQty,
      silverWeight: Math.round(silverWeight * 1000) / 1000,
      purityBreakdown: Object.keys(purityBreakdown).map((key) => ({
        purity: key,
        quantity: purityBreakdown[key].qty,
        weight: Math.round(purityBreakdown[key].weight * 1000) / 1000,
      })),
    };
  }

  @Get('payments')
  @RequirePermissions('billing.view')
  async getPaymentReport(
    @Query('startDate') startDateStr?: string,
    @Query('endDate') endDateStr?: string,
  ) {
    const query: any = { status: 'SUCCESS' };

    if (startDateStr && endDateStr) {
      const start = new Date(startDateStr);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDateStr);
      end.setHours(23, 59, 59, 999);
      query.paymentDate = { $gte: start, $lte: end };
    }

    const payments = await this.paymentModel.find(query);

    let cash = 0;
    let upi = 0;
    let card = 0;
    let bank = 0;
    let cheque = 0;

    payments.forEach((p) => {
      const method = p.method.toUpperCase();
      const amt = p.amount || 0;
      if (method === 'CASH') cash += amt;
      else if (method === 'UPI') upi += amt;
      else if (method === 'CARD') card += amt;
      else if (method === 'BANK_TRANSFER' || method === 'BANK') bank += amt;
      else if (method === 'CHEQUE') cheque += amt;
    });

    return {
      cash: roundMoney(cash),
      upi: roundMoney(upi),
      card: roundMoney(card),
      bank: roundMoney(bank),
      cheque: roundMoney(cheque),
      total: roundMoney(cash + upi + card + bank + cheque),
    };
  }

  @Get('outstanding')
  @RequirePermissions('billing.view')
  async getOutstandingReport(
    @Query('page') pageStr = '1',
    @Query('limit') limitStr = '20',
  ) {
    const page = Math.max(1, parseInt(pageStr, 10));
    const limit = Math.max(1, parseInt(limitStr, 10));
    const skip = (page - 1) * limit;

    const query = {
      status: { $in: ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'] },
      'paymentSummary.outstandingAmount': { $gt: 0 },
    };

    const bills = await this.billModel
      .find(query)
      .sort({ dueDate: 1 })
      .skip(skip)
      .limit(limit);

    const totalCount = await this.billModel.countDocuments(query);
    const now = new Date();

    const items = bills.map((bill) => {
      const dueDate = new Date(bill.dueDate);
      const diffTime = now.getTime() - dueDate.getTime();
      const overdueDays = diffTime > 0 ? Math.floor(diffTime / (1000 * 60 * 60 * 24)) : 0;

      return {
        _id: bill._id,
        invoiceNumber: bill.invoiceNumber,
        customerName: bill.customerSnapshot.name,
        customerPhone: bill.customerSnapshot.phone,
        total: roundMoney(bill.pricingSnapshot?.finalAmount || 0),
        paid: roundMoney(bill.paymentSummary?.paidAmount || 0),
        due: roundMoney(bill.paymentSummary?.outstandingAmount || 0),
        dueDate: bill.dueDate,
        overdueDays,
      };
    });

    // Aggregates total dues
    const allMatching = await this.billModel.find(query);
    const sumTotal = allMatching.reduce((acc, b) => acc + (b.pricingSnapshot?.finalAmount || 0), 0);
    const sumPaid = allMatching.reduce((acc, b) => acc + (b.paymentSummary?.paidAmount || 0), 0);
    const sumDue = allMatching.reduce((acc, b) => acc + (b.paymentSummary?.outstandingAmount || 0), 0);

    return {
      items,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      summary: {
        grandTotal: roundMoney(sumTotal),
        grandPaid: roundMoney(sumPaid),
        grandDue: roundMoney(sumDue),
      },
    };
  }

  @Get('gst')
  @RequirePermissions('billing.view')
  async getGstReport(
    @Query('startDate') startDateStr?: string,
    @Query('endDate') endDateStr?: string,
  ) {
    const query: any = { status: { $ne: 'CANCELLED' } };

    if (startDateStr && endDateStr) {
      const start = new Date(startDateStr);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDateStr);
      end.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: start, $lte: end };
    }

    const bills = await this.billModel.find(query);

    let taxableValue = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    bills.forEach((bill) => {
      taxableValue += bill.pricingSnapshot?.taxableAmount || 0;
      cgst += bill.pricingSnapshot?.cgst || 0;
      sgst += bill.pricingSnapshot?.sgst || 0;
      igst += bill.pricingSnapshot?.igst || 0;
    });

    const totalTax = cgst + sgst + igst;

    return {
      taxableValue: roundMoney(taxableValue),
      cgst: roundMoney(cgst),
      sgst: roundMoney(sgst),
      igst: roundMoney(igst),
      totalTax: roundMoney(totalTax),
    };
  }
}

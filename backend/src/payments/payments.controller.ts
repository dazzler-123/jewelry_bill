import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Bill } from '../schemas/bill.schema';
import { Payment } from '../schemas/payment.schema';
import { Customer } from '../schemas/customer.schema';
import { Notification } from '../schemas/notification.schema';
import { AuditLog } from '../schemas/audit-log.schema';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { roundMoney } from '../services/billing/calculation/calculation.engine';

interface CollectPaymentDto {
  billId: string;
  amount: number;
  method: string;
  paymentDate?: string;
  referenceNumber?: string;
  notes?: string;
}

interface RemindDto {
  channel: 'WHATSAPP' | 'SMS' | 'EMAIL';
}

@Controller('payments')
@UseGuards(AuthGuard, PermissionsGuard)
export class PaymentsController {
  constructor(
    @InjectModel(Bill.name) private billModel: Model<Bill>,
    @InjectModel(Payment.name) private paymentModel: Model<Payment>,
    @InjectModel(Customer.name) private customerModel: Model<Customer>,
    @InjectModel(Notification.name) private notificationModel: Model<Notification>,
    @InjectModel(AuditLog.name) private auditModel: Model<AuditLog>,
  ) {}

  @Get('due/summary')
  @RequirePermissions('payment.view')
  async getDueSummary() {
    const now = new Date();

    // 1. Automatically update active bills past their due dates to OVERDUE in the DB
    await this.billModel.updateMany(
      {
        status: { $in: ['UNPAID', 'PARTIALLY_PAID'] },
        dueDate: { $lt: now },
        'paymentSummary.outstandingAmount': { $gt: 0 },
      },
      { $set: { status: 'OVERDUE' } },
    );

    // 2. Fetch all bills with outstanding balances to compute statistics
    const activeBills = await this.billModel.find({
      status: { $in: ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'] },
      'paymentSummary.outstandingAmount': { $gt: 0 },
    });

    let totalOutstanding = 0;
    let dueToday = 0;
    let overdue = 0;
    let dueThisWeek = 0;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const endOfWeek = new Date();
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    activeBills.forEach((bill) => {
      const outstanding = bill.paymentSummary.outstandingAmount || 0;
      totalOutstanding += outstanding;

      const dueTime = bill.dueDate.getTime();

      if (dueTime < startOfToday.getTime()) {
        overdue += outstanding;
      } else if (dueTime >= startOfToday.getTime() && dueTime <= endOfToday.getTime()) {
        dueToday += outstanding;
      }

      if (dueTime >= startOfToday.getTime() && dueTime <= endOfWeek.getTime()) {
        dueThisWeek += outstanding;
      }
    });

    // 3. Fetch collections received today
    const paymentsToday = await this.paymentModel.find({
      status: 'SUCCESS',
      paymentDate: { $gte: startOfToday, $lte: endOfToday },
    });

    const collectedToday = paymentsToday.reduce((sum, p) => sum + (p.amount || 0), 0);

    return {
      totalOutstanding: roundMoney(totalOutstanding),
      dueToday: roundMoney(dueToday),
      overdue: roundMoney(overdue),
      dueThisWeek: roundMoney(dueThisWeek),
      collectedToday: roundMoney(collectedToday),
    };
  }

  @Get('due')
  @RequirePermissions('payment.view')
  async getDueBills() {
    const now = new Date();
    // Dynamic Overdue Sync
    await this.billModel.updateMany(
      {
        status: { $in: ['UNPAID', 'PARTIALLY_PAID'] },
        dueDate: { $lt: now },
        'paymentSummary.outstandingAmount': { $gt: 0 },
      },
      { $set: { status: 'OVERDUE' } },
    );

    // List all invoices with outstanding balances
    return this.billModel
      .find({
        status: { $in: ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'] },
        'paymentSummary.outstandingAmount': { $gt: 0 },
      })
      .populate('createdBy', 'name email')
      .sort({ dueDate: 1 });
  }

  @Get('history/:billId')
  @RequirePermissions('payment.view')
  async getPaymentTimeline(@Param('billId') billId: string) {
    return this.paymentModel
      .find({ billId: new Types.ObjectId(billId) })
      .populate('createdBy', 'name email')
      .sort({ createdAt: 1 });
  }

  @Post('collect')
  @RequirePermissions('payment.create')
  async collectPayment(@Body() body: CollectPaymentDto, @Req() req: any) {
    const { billId, amount, method, referenceNumber, notes } = body;
    const creatorId = new Types.ObjectId(req.user?.sub);

    if (!billId || amount === undefined || !method) {
      throw new BadRequestException('billId, amount, and method are required');
    }

    if (amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }

    const bill = await this.billModel.findById(billId);
    if (!bill) {
      throw new NotFoundException('Bill not found');
    }

    if (bill.status === 'PAID' || bill.status === 'CANCELLED') {
      throw new BadRequestException(`Cannot collect payment for a ${bill.status} bill`);
    }

    const oldDue = bill.paymentSummary.outstandingAmount;
    if (amount > oldDue) {
      throw new BadRequestException(`Payment amount (₹${amount}) exceeds outstanding due (₹${oldDue})`);
    }

    const paymentDate = body.paymentDate ? new Date(body.paymentDate) : new Date();
    if (isNaN(paymentDate.getTime())) {
      throw new BadRequestException('Invalid payment date format');
    }

    // Generate unique paymentId sequentially/timestamp based
    const payCount = await this.paymentModel.countDocuments();
    const paymentId = `PAY-${Date.now().toString().slice(-4)}-${String(payCount + 1).padStart(3, '0')}`;

    // Create the immutable Payment transaction
    const newPayment = await this.paymentModel.create({
      paymentId,
      billId: bill._id,
      customerId: bill.customerSnapshot.customerId,
      amount,
      method: method.toUpperCase(),
      paymentDate,
      referenceNumber,
      notes,
      createdBy: creatorId,
      status: 'SUCCESS',
    });

    // Update parent bill balances
    bill.paymentSummary.paidAmount = roundMoney(bill.paymentSummary.paidAmount + amount);
    bill.paymentSummary.outstandingAmount = roundMoney(Math.max(0, oldDue - amount));

    // Resolve invoice payment status
    const isOverdue = bill.dueDate.getTime() < Date.now();
    if (bill.paymentSummary.outstandingAmount === 0) {
      bill.status = 'PAID';
    } else {
      bill.status = isOverdue ? 'OVERDUE' : 'PARTIALLY_PAID';
    }
    await bill.save();

    // Log collect audit log
    await this.auditModel.create({
      userId: creatorId,
      action: 'PAYMENT_COLLECT',
      entityType: 'Payment',
      entityId: newPayment._id,
      after: newPayment.toJSON(),
    });

    return {
      success: true,
      payment: newPayment,
      oldDue,
      newDue: bill.paymentSummary.outstandingAmount,
    };
  }

  @Post(':id/reverse')
  @RequirePermissions('payment.refund')
  async reversePayment(@Param('id') id: string, @Req() req: any) {
    const operatorId = new Types.ObjectId(req.user?.sub);
    const payment = await this.paymentModel.findById(id);
    if (!payment) {
      throw new NotFoundException('Payment transaction not found');
    }

    if (payment.status === 'FAILED') {
      throw new BadRequestException('This payment has already been reversed or has failed');
    }

    const bill = await this.billModel.findById(payment.billId);
    if (!bill) {
      throw new NotFoundException('Associated invoice not found');
    }

    const beforeState = payment.toJSON();

    // Revert the payment status to FAILED (immutable recording, does not delete)
    payment.status = 'FAILED';
    payment.notes = `[REVERSED] ${payment.notes || ''}`.trim();
    await payment.save();

    // Restore the bill's due balances
    bill.paymentSummary.paidAmount = roundMoney(Math.max(0, bill.paymentSummary.paidAmount - payment.amount));
    bill.paymentSummary.outstandingAmount = roundMoney(bill.paymentSummary.outstandingAmount + payment.amount);

    // Re-evaluate bill status
    const isOverdue = bill.dueDate.getTime() < Date.now();
    if (bill.paymentSummary.outstandingAmount === 0) {
      bill.status = 'PAID';
    } else {
      bill.status = isOverdue ? 'OVERDUE' : (bill.paymentSummary.paidAmount > 0 ? 'PARTIALLY_PAID' : 'UNPAID');
    }
    await bill.save();

    // Log audit trail
    await this.auditModel.create({
      userId: operatorId,
      action: 'PAYMENT_REVERSE',
      entityType: 'Payment',
      entityId: payment._id,
      before: beforeState,
      after: payment.toJSON(),
    });

    return {
      success: true,
      message: 'Payment reversed successfully',
      payment,
      newDue: bill.paymentSummary.outstandingAmount,
    };
  }

  @Post('remind/:billId')
  @RequirePermissions('payment.view')
  async sendReminder(
    @Param('billId') billId: string,
    @Body() body: RemindDto,
    @Req() req: any,
  ) {
    const { channel } = body;
    const operatorId = new Types.ObjectId(req.user?.sub);

    if (!channel || !['WHATSAPP', 'SMS', 'EMAIL'].includes(channel)) {
      throw new BadRequestException('channel must be one of WHATSAPP, SMS, or EMAIL');
    }

    const bill = await this.billModel.findById(billId);
    if (!bill) {
      throw new NotFoundException('Bill not found');
    }

    const customer = await this.customerModel.findById(bill.customerSnapshot.customerId);
    if (!customer) {
      throw new NotFoundException('Customer contact details not found');
    }

    const name = customer.name;
    const phone = customer.phone;
    const email = customer.email || 'N/A';
    const amountDue = bill.paymentSummary.outstandingAmount;
    const invoice = bill.invoiceNumber;
    const dueDateStr = bill.dueDate.toLocaleDateString('en-IN');

    let messageText = '';
    if (channel === 'WHATSAPP') {
      messageText = `Dear ${name}, this is a friendly payment reminder from Aurum Jewelry. An outstanding amount of *₹${amountDue.toLocaleString('en-IN')}* is due against invoice *${invoice}* by ${dueDateStr}. Please clear the balance. Thank you!`;
    } else if (channel === 'SMS') {
      messageText = `Dear ${name}, friendly reminder from Aurum Jewelry. ₹${amountDue} is outstanding against bill ${invoice} due by ${dueDateStr}. Please pay soon.`;
    } else if (channel === 'EMAIL') {
      messageText = `Subject: Outstanding Invoice Payment Reminder - ${invoice}

Dear ${name},

This email is a friendly reminder that invoice ${invoice} has a pending balance of ₹${amountDue.toLocaleString('en-IN')}, which is scheduled to be cleared by ${dueDateStr}.

Please arrange for payment via cash, card, UPI or bank transfer.

Sincerely,
Aurum Jewelry Billing Support`;
    }

    // Print to console (Mock architecture)
    console.log(`[REMINDER CHANNEL: ${channel}] To: ${channel === 'EMAIL' ? email : phone}`);
    console.log(`[MESSAGE TEXT]:\n${messageText}\n----------------------------------`);

    // Log notification in the DB
    await this.notificationModel.create({
      userId: operatorId,
      message: `Sent ${channel} reminder to ${name} for ${invoice} (Due: ₹${amountDue})`,
      type: 'INFO',
      read: false,
    });

    return {
      success: true,
      channel,
      recipient: channel === 'EMAIL' ? email : phone,
      messageText,
    };
  }
}

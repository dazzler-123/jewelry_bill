import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Req,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import {
  calculateInvoiceItem,
  calculateInvoiceSummary,
  roundMoney,
} from '../services/billing/calculation/calculation.engine';

interface CreateBillDto {
  customerId?: string;
  newCustomer?: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    gstin?: string;
  };
  items: Array<{
    productId?: string;
    barcode?: string;
    productName: string;
    sku?: string;
    metal: string;
    purity: string;
    grossWeight: number;
    stoneWeight?: number;
    otherWeight?: number;
    metalRate: number;
    makingChargeType: string;
    makingChargeRate: number;
    wastageType: string;
    wastageRate: number;
    stoneChargeType?: string;
    stoneRate?: number;
    stonePieces?: number;
    stoneWeightCarats?: number;
    otherCharge?: number;
    discountType?: string;
    discountRate?: number;
  }>;
  isInterState?: boolean;
  payments: Array<{
    method: string;
    amount: number;
    referenceNumber?: string;
    notes?: string;
  }>;
  dueDate: string;
  notes?: string;
  clientTxId?: string;
}

interface EditBillDto {
  items: Array<{
    productId?: string;
    barcode?: string;
    productName: string;
    sku?: string;
    metal: string;
    purity: string;
    grossWeight: number;
    stoneWeight?: number;
    otherWeight?: number;
    metalRate: number;
    makingChargeType: string;
    makingChargeRate: number;
    wastageType: string;
    wastageRate: number;
    stoneChargeType?: string;
    stoneRate?: number;
    stonePieces?: number;
    stoneWeightCarats?: number;
    otherCharge?: number;
    discountType?: string;
    discountRate?: number;
  }>;
  isInterState?: boolean;
  dueDate: string;
  notes?: string;
  editReason: string;
}

interface ReturnItemsDto {
  items: Array<{
    inventoryItemId?: string;
    sku?: string;
    name: string;
    weight: number;
    value: number;
  }>;
  reason: string;
  refundMethod: string;
  refundAmount: number;
}

@Controller('bills')
@UseGuards(AuthGuard, PermissionsGuard)
export class BillsController {
  constructor(
    @InjectModel(Bill.name) private billModel: Model<Bill>,
    @InjectModel(Customer.name) private customerModel: Model<Customer>,
    @InjectModel(InventoryItem.name) private inventoryModel: Model<InventoryItem>,
    @InjectModel(Payment.name) private paymentModel: Model<Payment>,
    @InjectModel(MetalRate.name) private metalRateModel: Model<MetalRate>,
    @InjectModel(ShopSettings.name) private settingsModel: Model<ShopSettings>,
    @InjectModel(AuditLog.name) private auditModel: Model<AuditLog>,
    @InjectModel(BillRevision.name) private revisionModel: Model<BillRevision>,
    @InjectModel(Return.name) private returnModel: Model<Return>,
    @InjectModel(Refund.name) private refundModel: Model<Refund>,
    @InjectModel(InventoryHistory.name) private historyModel: Model<InventoryHistory>,
  ) {}

  @Get()
  @RequirePermissions('billing.view')
  async getAll() {
    return this.billModel
      .find()
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
  }

  @Get(':id')
  @RequirePermissions('billing.view')
  async getOne(@Param('id') id: string) {
    const bill = await this.billModel
      .findById(id)
      .populate('createdBy', 'name email');
    if (!bill) {
      throw new NotFoundException('Bill not found');
    }
    return bill;
  }

  @Get(':id/revisions')
  @RequirePermissions('billing.view')
  async getRevisions(@Param('id') id: string) {
    return this.revisionModel
      .find({ billId: new Types.ObjectId(id) })
      .populate('changedBy', 'name email')
      .sort({ version: -1 });
  }

  @Get('settings/active')
  @RequirePermissions('billing.view')
  async getSettings() {
    let settings = await this.settingsModel.findOne();
    if (!settings) {
      settings = await this.settingsModel.create({
        name: 'Aurum Jewelry House',
        address: '102, Gold Palace Mansion, Jeweler\'s Bazar, Mumbai, MH - 400001',
        phone: '9876543210',
        email: 'billing@aurum.com',
        gstin: '27AAAAA1111A1Z1',
        invoicePrefix: 'INV-2026-',
        termsAndConditions: '1. Goods once sold will not be taken back or exchanged.\n2. Subject to Mumbai Jurisdiction.',
        startingNumber: 1001,
        invoiceFormat: 'A4',
        currency: 'INR',
        decimalPrecision: 2,
        weightPrecision: 3,
        cgstRate: 1.5,
        sgstRate: 1.5,
        igstRate: 3.0,
        defaultPaymentMethod: 'UPI',
        defaultDuePeriod: 15,
        defaultMakingCharge: 0,
        defaultWastage: 0,
        roundingRule: 'HALF_UP',
        themePreference: 'light',
        densityPreference: 'comfortable',
        invoiceTemplate: 'CLASSIC',
      });
    }
    return settings;
  }

  @Put('settings/active')
  @RequirePermissions('settings.manage')
  async updateSettings(@Body() body: any, @Req() req: any) {
    const userId = new Types.ObjectId(req.user?.sub);
    let settings = await this.settingsModel.findOne();
    const beforeState = settings ? settings.toObject() : {};

    if (!settings) {
      settings = new this.settingsModel();
    }
    settings.name = body.name || 'Aurum Jewelry House';
    settings.address = body.address || '';
    settings.phone = body.phone || '';
    settings.alternatePhone = body.alternatePhone || '';
    settings.email = body.email || '';
    settings.gstin = body.gstin || '';
    settings.pan = body.pan || '';
    settings.invoicePrefix = body.invoicePrefix || 'INV-2026-';
    settings.termsAndConditions = body.termsAndConditions || '';
    settings.bankName = body.bankName || '';
    settings.accountNumber = body.accountNumber || '';
    settings.ifscCode = body.ifscCode || '';
    settings.branchName = body.branchName || '';
    settings.whatsappMessageTemplate = body.whatsappMessageTemplate || '';

    // Expanded Settings Fields
    settings.website = body.website || '';
    settings.logoUrl = body.logoUrl || '';
    settings.footerMessage = body.footerMessage || '';
    settings.startingNumber = body.startingNumber !== undefined ? body.startingNumber : 1001;
    settings.invoiceFormat = body.invoiceFormat || 'A4';
    settings.currency = body.currency || 'INR';
    settings.decimalPrecision = body.decimalPrecision !== undefined ? body.decimalPrecision : 2;
    settings.weightPrecision = body.weightPrecision !== undefined ? body.weightPrecision : 3;
    settings.cgstRate = body.cgstRate !== undefined ? body.cgstRate : 1.5;
    settings.sgstRate = body.sgstRate !== undefined ? body.sgstRate : 1.5;
    settings.igstRate = body.igstRate !== undefined ? body.igstRate : 3.0;
    settings.defaultPaymentMethod = body.defaultPaymentMethod || 'UPI';
    settings.defaultDuePeriod = body.defaultDuePeriod !== undefined ? body.defaultDuePeriod : 15;
    settings.defaultMakingCharge = body.defaultMakingCharge !== undefined ? body.defaultMakingCharge : 0;
    settings.defaultWastage = body.defaultWastage !== undefined ? body.defaultWastage : 0;
    settings.roundingRule = body.roundingRule || 'HALF_UP';
    settings.themePreference = body.themePreference || 'light';
    settings.densityPreference = body.densityPreference || 'comfortable';
    settings.invoiceTemplate = body.invoiceTemplate || 'CLASSIC';

    await settings.save();
    const afterState = settings.toObject();

    // Log update in Audit trail
    await this.auditModel.create({
      userId,
      action: 'UPDATE_SETTINGS',
      entityType: 'ShopSettings',
      entityId: settings._id,
      before: beforeState,
      after: afterState,
      reason: 'Shop configurations modified via settings page',
    });

    return settings;
  }

  @Post()
  @RequirePermissions('billing.create')
  async create(@Body() body: CreateBillDto, @Req() req: any) {
    const creatorId = new Types.ObjectId(req.user?.sub);
    const { items, isInterState, payments, dueDate, notes, clientTxId } = body;

    // Idempotent processing to avoid duplicate offline syncs
    if (clientTxId) {
      const existing = await this.billModel.findOne({ clientTxId }).populate('createdBy', 'name email');
      if (existing) {
        return existing;
      }
    }

    // 1. Validation of main parameters
    if (!items || items.length === 0) {
      throw new BadRequestException('Invoice must contain at least one line item');
    }
    if (!dueDate) {
      throw new BadRequestException('Due date is required');
    }

    // 2. Resolve Customer (retrieve existing or create on-the-fly)
    let customerDoc: Customer | null = null;
    if (body.customerId) {
      customerDoc = await this.customerModel.findById(body.customerId);
      if (!customerDoc) {
        throw new BadRequestException('Specified customer not found');
      }
    } else if (body.newCustomer) {
      const { name, phone } = body.newCustomer;
      if (!name || !phone) {
        throw new BadRequestException('New customer requires name and phone number');
      }

      // Check if phone already registered to avoid duplication
      const existing = await this.customerModel.findOne({ phone: phone.trim() });
      if (existing) {
        customerDoc = existing; // reuse existing
      } else {
        const codeSuffix = Math.floor(1000 + Math.random() * 9000);
        customerDoc = await this.customerModel.create({
          ...body.newCustomer,
          phone: phone.trim(),
          customerCode: `CUST-${codeSuffix}`,
        });
      }
    } else {
      throw new BadRequestException('Either customerId or newCustomer details must be provided');
    }

    // Create Customer Snapshot for storing inside the Bill
    const customerSnapshot = {
      customerId: customerDoc._id,
      customerCode: customerDoc.customerCode,
      name: customerDoc.name,
      phone: customerDoc.phone,
      gstin: customerDoc.gstin,
      address: customerDoc.address,
    };

    // 3. Resolve and validate Inventory Items
    const inventoryItemsToUpdate: InventoryItem[] = [];
    for (const item of items) {
      if (item.barcode) {
        const invItem = await this.inventoryModel.findOne({
          barcode: item.barcode.trim(),
        });
        if (!invItem) {
          throw new BadRequestException(`Inventory item with barcode ${item.barcode} not found`);
        }
        if (invItem.status !== 'IN_STOCK') {
          throw new BadRequestException(`Inventory item ${item.barcode} is not in stock (${invItem.status})`);
        }
        inventoryItemsToUpdate.push(invItem);
      }
    }

    const settings = await this.settingsModel.findOne();
    const customTaxes = settings ? {
      cgst: settings.cgstRate,
      sgst: settings.sgstRate,
      igst: settings.igstRate,
    } : undefined;

    // 4. Server-side Calculations via calculation.engine.ts
    const calculatedItems = items.map((item) => {
      const calcInput = {
        metal: item.metal as any,
        purity: item.purity,
        grossWeight: item.grossWeight,
        stoneWeight: item.stoneWeight || 0,
        otherWeight: item.otherWeight || 0,
        metalRate: item.metalRate,
        makingChargeType: item.makingChargeType as any,
        makingChargeRate: item.makingChargeRate,
        wastageType: item.wastageType as any,
        wastageRate: item.wastageRate,
        stoneChargeType: item.stoneChargeType as any,
        stoneRate: item.stoneRate || 0,
        stonePieces: item.stonePieces || 0,
        stoneWeightCarats: item.stoneWeightCarats || 0,
        otherCharge: item.otherCharge || 0,
        discountType: item.discountType as any,
        discountRate: item.discountRate || 0,
      };

      const calcResult = calculateInvoiceItem(calcInput, isInterState, customTaxes);
      return {
        productId: item.productId ? new Types.ObjectId(item.productId) as any : undefined,
        productName: item.productName,
        sku: item.sku,
        barcode: item.barcode,
        metal: item.metal,
        purity: item.purity,
        grossWeight: item.grossWeight,
        stoneWeight: item.stoneWeight || 0,
        otherWeight: item.otherWeight || 0,
        netWeight: calcResult.netWeight,
        metalRate: item.metalRate,
        metalValue: calcResult.metalValue,
        makingChargeType: item.makingChargeType,
        makingChargeRate: item.makingChargeRate,
        makingChargeAmount: calcResult.makingChargeAmount,
        wastageType: item.wastageType,
        wastageRate: item.wastageRate,
        wastageAmount: calcResult.wastageAmount,
        stoneCharge: calcResult.stoneCharge,
        otherCharge: calcResult.otherCharge,
        discount: calcResult.discountAmount,
        taxableAmount: calcResult.taxableAmount,
        tax: calcResult.taxAmount,
        cgst: calcResult.cgstAmount,
        sgst: calcResult.sgstAmount,
        igst: calcResult.igstAmount,
        finalAmount: calcResult.finalAmount,
      };
    });

    const inputForSummary = calculatedItems.map((item) => ({
      metal: item.metal as any,
      purity: item.purity,
      grossWeight: item.grossWeight,
      stoneWeight: item.stoneWeight,
      otherWeight: item.otherWeight,
      metalRate: item.metalRate,
      makingChargeType: item.makingChargeType as any,
      makingChargeRate: item.makingChargeRate,
      wastageType: item.wastageType as any,
      wastageRate: item.wastageRate,
      stoneChargeType: item.makingChargeType as any,
      stoneRate: item.stoneCharge,
      stonePieces: 0,
      stoneWeightCarats: 0,
      otherCharge: item.otherCharge,
      discountType: 'FIXED' as const,
      discountRate: item.discount,
    }));

    const invoiceSummary = calculateInvoiceSummary({
      items: inputForSummary,
      isInterState,
    }, customTaxes);

    // 5. Aggregating active metal rates for snapshotted reference
    const now = new Date();
    const activeRates = await this.metalRateModel.aggregate([
      { $match: { effectiveDate: { $lte: now } } },
      { $sort: { metalType: 1, purity: 1, effectiveDate: -1 } },
      {
        $group: {
          _id: { metalType: '$metalType', purity: '$purity' },
          ratePerGram: { $first: '$ratePerGram' },
        },
      },
    ]);
    const rateSnapshotItems = activeRates.map((r) => ({
      metalType: r._id.metalType,
      purity: r._id.purity,
      ratePerGram: r.ratePerGram,
    }));

    // 6. Generate invoice number sequentially using prefix
    let invoicePrefix = 'INV-2026-';
    if (settings && settings.invoicePrefix) {
      invoicePrefix = settings.invoicePrefix;
    }

    const billCount = await this.billModel.countDocuments();
    const invoiceNumber = `${invoicePrefix}${String(billCount + 1).padStart(4, '0')}`;

    // 7. Calculate payments split & determine status
    const paymentList = payments || [];
    const totalPaid = paymentList.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const grandTotal = invoiceSummary.finalAmount;
    const outstandingAmount = roundMoney(Math.max(0, grandTotal - totalPaid));

    let billStatus = 'UNPAID';
    if (totalPaid > 0) {
      if (outstandingAmount === 0) {
        billStatus = 'PAID';
      } else {
        billStatus = 'PARTIALLY_PAID';
      }
    }

    // 8. Create Bill
    const newBill = await this.billModel.create({
      invoiceNumber,
      customerSnapshot,
      itemsSnapshot: calculatedItems,
      rateSnapshot: { rates: rateSnapshotItems },
      pricingSnapshot: {
        subtotal: invoiceSummary.subtotal,
        makingChargesTotal: invoiceSummary.makingChargesTotal,
        wastageChargesTotal: invoiceSummary.wastageChargesTotal,
        stoneChargesTotal: invoiceSummary.stoneChargesTotal,
        otherChargesTotal: invoiceSummary.otherChargesTotal,
        discountAmount: invoiceSummary.discountAmount,
        taxableAmount: invoiceSummary.taxableAmount,
        taxAmount: invoiceSummary.taxAmount,
        cgst: invoiceSummary.cgstTotal,
        sgst: invoiceSummary.sgstTotal,
        igst: invoiceSummary.igstTotal,
        finalAmount: grandTotal,
      },
      paymentSummary: {
        paidAmount: totalPaid,
        outstandingAmount,
      },
      status: billStatus,
      dueDate: new Date(dueDate),
      notes,
      createdBy: creatorId,
      clientTxId,
    });

    // 9. Create Payments split transactions
    for (const paymentInput of paymentList) {
      if (Number(paymentInput.amount) > 0) {
        const payCount = await this.paymentModel.countDocuments();
        const paymentId = `PAY-${Date.now().toString().slice(-4)}-${String(payCount + 1).padStart(3, '0')}`;

        await this.paymentModel.create({
          paymentId,
          billId: newBill._id,
          customerId: customerDoc._id,
          amount: Number(paymentInput.amount),
          method: paymentInput.method.toUpperCase(),
          referenceNumber: paymentInput.referenceNumber,
          notes: paymentInput.notes,
          createdBy: creatorId,
          status: 'SUCCESS',
        });
      }
    }

    // 10. Update sold inventory items to SOLD (atomic duplicate sale prevention)
    for (const invItem of inventoryItemsToUpdate) {
      const updated = await this.inventoryModel.findOneAndUpdate(
        { _id: invItem._id, status: 'IN_STOCK' },
        { $set: { status: 'SOLD' } },
        { new: true }
      );
      if (!updated) {
        throw new BadRequestException(`Inventory item ${invItem.barcode} was already sold or is no longer in stock`);
      }

      await this.historyModel.create({
        itemId: invItem._id,
        previousStatus: 'IN_STOCK',
        newStatus: 'SOLD',
        reason: `Sold via Invoice ${newBill.invoiceNumber}`,
        userId: creatorId,
        billId: newBill._id,
      });
    }

    // 11. Create Audit Log
    await this.auditModel.create({
      userId: creatorId,
      action: 'BILL_CREATE',
      entityType: 'Bill',
      entityId: newBill._id,
      after: newBill.toJSON(),
    });

    return this.billModel
      .findById(newBill._id)
      .populate('createdBy', 'name email');
  }

  @Put(':id')
  @RequirePermissions('billing.edit')
  async editBill(
    @Param('id') id: string,
    @Body() body: EditBillDto,
    @Req() req: any,
  ) {
    const editorId = new Types.ObjectId(req.user?.sub);
    const { items, isInterState, dueDate, notes, editReason } = body;

    if (!editReason || !editReason.trim()) {
      throw new BadRequestException('Edit reason is required to log revision history');
    }

    if (!items || items.length === 0) {
      throw new BadRequestException('Invoice must contain at least one line item');
    }

    const bill = await this.billModel.findById(id);
    if (!bill) {
      throw new NotFoundException('Bill not found');
    }

    if (bill.status === 'CANCELLED') {
      throw new BadRequestException('Cannot edit a cancelled bill');
    }

    const beforeState = bill.toJSON();

    // 1. Handle inventory adjustments
    const oldBarcodes = (bill.itemsSnapshot || [])
      .map((item) => item.barcode)
      .filter(Boolean) as string[];
    const newBarcodes = items.map((item) => item.barcode).filter(Boolean) as string[];

    // Barcodes removed from invoice (Revert to IN_STOCK)
    const barcodesToRemove = oldBarcodes.filter((b) => !newBarcodes.includes(b));
    for (const bc of barcodesToRemove) {
      const updated = await this.inventoryModel.findOneAndUpdate(
        { barcode: bc, status: 'SOLD' },
        { $set: { status: 'IN_STOCK' } },
        { new: true }
      );
      if (updated) {
        await this.historyModel.create({
          itemId: updated._id,
          previousStatus: 'SOLD',
          newStatus: 'IN_STOCK',
          reason: `Removed from Invoice ${bill.invoiceNumber} adjustment`,
          userId: editorId,
          billId: bill._id,
        });
      }
    }

    // Barcodes added to invoice (Set to SOLD)
    const barcodesToAdd = newBarcodes.filter((b) => !oldBarcodes.includes(b));
    for (const bc of barcodesToAdd) {
      const updated = await this.inventoryModel.findOneAndUpdate(
        { barcode: bc, status: 'IN_STOCK' },
        { $set: { status: 'SOLD' } },
        { new: true }
      );
      if (!updated) {
        throw new BadRequestException(`Inventory item ${bc} was already sold or is no longer in stock`);
      }
      
      await this.historyModel.create({
        itemId: updated._id,
        previousStatus: 'IN_STOCK',
        newStatus: 'SOLD',
        reason: `Added to Invoice ${bill.invoiceNumber} adjustment`,
        userId: editorId,
        billId: bill._id,
      });
    }

    const settings = await this.settingsModel.findOne();
    const customTaxes = settings ? {
      cgst: settings.cgstRate,
      sgst: settings.sgstRate,
      igst: settings.igstRate,
    } : undefined;

    // 2. Perform Calculations
    const calculatedItems = items.map((item) => {
      const calcInput = {
        metal: item.metal as any,
        purity: item.purity,
        grossWeight: item.grossWeight,
        stoneWeight: item.stoneWeight || 0,
        otherWeight: item.otherWeight || 0,
        metalRate: item.metalRate,
        makingChargeType: item.makingChargeType as any,
        makingChargeRate: item.makingChargeRate,
        wastageType: item.wastageType as any,
        wastageRate: item.wastageRate,
        stoneChargeType: item.stoneChargeType as any,
        stoneRate: item.stoneRate || 0,
        stonePieces: item.stonePieces || 0,
        stoneWeightCarats: item.stoneWeightCarats || 0,
        otherCharge: item.otherCharge || 0,
        discountType: item.discountType as any,
        discountRate: item.discountRate || 0,
      };

      const calcResult = calculateInvoiceItem(calcInput, isInterState, customTaxes);
      return {
        productId: item.productId ? new Types.ObjectId(item.productId) as any : undefined,
        productName: item.productName,
        sku: item.sku,
        barcode: item.barcode,
        metal: item.metal,
        purity: item.purity,
        grossWeight: item.grossWeight,
        stoneWeight: item.stoneWeight || 0,
        otherWeight: item.otherWeight || 0,
        netWeight: calcResult.netWeight,
        metalRate: item.metalRate,
        metalValue: calcResult.metalValue,
        makingChargeType: item.makingChargeType,
        makingChargeRate: item.makingChargeRate,
        makingChargeAmount: calcResult.makingChargeAmount,
        wastageType: item.wastageType,
        wastageRate: item.wastageRate,
        wastageAmount: calcResult.wastageAmount,
        stoneCharge: calcResult.stoneCharge,
        otherCharge: calcResult.otherCharge,
        discount: calcResult.discountAmount,
        taxableAmount: calcResult.taxableAmount,
        tax: calcResult.taxAmount,
        cgst: calcResult.cgstAmount,
        sgst: calcResult.sgstAmount,
        igst: calcResult.igstAmount,
        finalAmount: calcResult.finalAmount,
      };
    });

    const inputForSummary = calculatedItems.map((item) => ({
      metal: item.metal as any,
      purity: item.purity,
      grossWeight: item.grossWeight,
      stoneWeight: item.stoneWeight,
      otherWeight: item.otherWeight,
      metalRate: item.metalRate,
      makingChargeType: item.makingChargeType as any,
      makingChargeRate: item.makingChargeRate,
      wastageType: item.wastageType as any,
      wastageRate: item.wastageRate,
      stoneChargeType: item.makingChargeType as any,
      stoneRate: item.stoneCharge,
      stonePieces: 0,
      stoneWeightCarats: 0,
      otherCharge: item.otherCharge,
      discountType: 'FIXED' as const,
      discountRate: item.discount,
    }));

    const invoiceSummary = calculateInvoiceSummary({
      items: inputForSummary,
      isInterState,
    }, customTaxes);

    const grandTotal = invoiceSummary.finalAmount;
    const totalPaid = bill.paymentSummary.paidAmount;
    const outstandingAmount = roundMoney(Math.max(0, grandTotal - totalPaid));

    // Resolve bill status
    const isOverdue = new Date(dueDate).getTime() < Date.now();
    let billStatus = 'UNPAID';
    if (totalPaid > 0) {
      billStatus = outstandingAmount === 0 ? 'PAID' : (isOverdue ? 'OVERDUE' : 'PARTIALLY_PAID');
    } else {
      billStatus = isOverdue ? 'OVERDUE' : 'UNPAID';
    }

    // 3. Update Bill
    bill.itemsSnapshot = calculatedItems;
    bill.pricingSnapshot = {
      subtotal: invoiceSummary.subtotal,
      makingChargesTotal: invoiceSummary.makingChargesTotal,
      wastageChargesTotal: invoiceSummary.wastageChargesTotal,
      stoneChargesTotal: invoiceSummary.stoneChargesTotal,
      otherChargesTotal: invoiceSummary.otherChargesTotal,
      discountAmount: invoiceSummary.discountAmount,
      taxableAmount: invoiceSummary.taxableAmount,
      taxAmount: invoiceSummary.taxAmount,
      cgst: invoiceSummary.cgstTotal,
      sgst: invoiceSummary.sgstTotal,
      igst: invoiceSummary.igstTotal,
      finalAmount: grandTotal,
    };
    bill.paymentSummary.outstandingAmount = outstandingAmount;
    bill.status = billStatus;
    bill.dueDate = new Date(dueDate);
    bill.notes = notes;
    bill.updatedBy = editorId as any;
    await bill.save();

    const afterState = bill.toJSON();

    // 4. Create Revision Version record
    const revisionCount = await this.revisionModel.countDocuments({ billId: bill._id });
    await this.revisionModel.create({
      billId: bill._id,
      version: revisionCount + 1,
      previousData: beforeState,
      newData: afterState,
      reason: editReason,
      changedBy: editorId,
    });

    // 5. Create Audit Log
    await this.auditModel.create({
      userId: editorId,
      action: 'BILL_EDIT',
      entityType: 'Bill',
      entityId: bill._id,
      before: beforeState,
      after: afterState,
    });

    return this.billModel
      .findById(bill._id)
      .populate('createdBy', 'name email');
  }

  @Post(':id/return')
  @RequirePermissions('billing.edit')
  async returnBillItems(
    @Param('id') id: string,
    @Body() body: ReturnItemsDto,
    @Req() req: any,
  ) {
    const operatorId = new Types.ObjectId(req.user?.sub);
    const { items, reason, refundMethod, refundAmount } = body;

    if (!items || items.length === 0) {
      throw new BadRequestException('At least one item must be returned');
    }

    const bill = await this.billModel.findById(id);
    if (!bill) {
      throw new NotFoundException('Bill not found');
    }

    if (bill.status === 'CANCELLED') {
      throw new BadRequestException('Cannot return items for a cancelled bill');
    }

    const beforeState = bill.toJSON();

    const totalReturnedValue = items.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
    if (refundAmount > totalReturnedValue) {
      throw new BadRequestException('Refund amount cannot exceed value of returned items');
    }

    // 1. Restore inventory item statuses to RETURNED where applicable
    for (const item of items) {
      let invItem: any = null;
      if (item.inventoryItemId) {
        invItem = await this.inventoryModel.findById(item.inventoryItemId);
      } else if (item.sku) {
        invItem = await this.inventoryModel.findOne({ sku: item.sku, status: 'SOLD' });
      }

      if (invItem) {
        const oldStatus = invItem.status;
        invItem.status = 'RETURNED';
        await invItem.save();

        await this.historyModel.create({
          itemId: invItem._id,
          previousStatus: oldStatus,
          newStatus: 'RETURNED',
          reason: `Returned from Invoice ${bill.invoiceNumber}: ${reason || 'Return clearance'}`,
          userId: operatorId,
          billId: bill._id,
        });
      }
    }

    // 2. Create Return Document
    const returnCount = await this.returnModel.countDocuments();
    const returnId = `RET-${Date.now().toString().slice(-4)}-${String(returnCount + 1).padStart(3, '0')}`;
    const returnDoc = await this.returnModel.create({
      returnId,
      billId: bill._id,
      items: items.map((item) => ({
        inventoryItemId: item.inventoryItemId ? new Types.ObjectId(item.inventoryItemId) : undefined,
        sku: item.sku,
        name: item.name,
        weight: Number(item.weight) || 0,
        value: Number(item.value) || 0,
      })),
      returnDate: new Date(),
      status: 'PROCESSED',
      processedBy: operatorId,
    });

    // 3. Create Refund Transaction if refund amount is registered
    if (refundAmount > 0) {
      const refundCount = await this.refundModel.countDocuments();
      const refundId = `REF-${Date.now().toString().slice(-4)}-${String(refundCount + 1).padStart(3, '0')}`;
      await this.refundModel.create({
        refundId,
        billId: bill._id,
        amount: refundAmount,
        method: refundMethod ? refundMethod.toUpperCase() : 'CASH',
        refundDate: new Date(),
        reason: reason || 'Return clearance refund',
        status: 'SUCCESS',
        processedBy: operatorId,
      });
    }

    // 4. Update Bill Balances & Total Value
    const oldFinal = bill.pricingSnapshot.finalAmount;
    const newFinal = roundMoney(Math.max(0, oldFinal - totalReturnedValue));

    // Reduce bill paidAmount by refundAmount (cash given out to customer)
    const oldPaid = bill.paymentSummary.paidAmount;
    const newPaid = roundMoney(Math.max(0, oldPaid - refundAmount));

    const newOutstanding = roundMoney(Math.max(0, newFinal - newPaid));

    bill.pricingSnapshot.finalAmount = newFinal;
    bill.paymentSummary.paidAmount = newPaid;
    bill.paymentSummary.outstandingAmount = newOutstanding;

    // Evaluate return status
    const isOverdue = bill.dueDate.getTime() < Date.now();
    if (newFinal === 0) {
      bill.status = 'RETURNED';
    } else {
      bill.status = newOutstanding === 0 ? 'PAID' : (isOverdue ? 'OVERDUE' : 'PARTIALLY_PAID');
    }
    bill.notes = `[ITEMS RETURNED: ${reason}] `.trim() + (bill.notes || '');
    await bill.save();

    const afterState = bill.toJSON();

    // 5. Create Audit Logs
    await this.auditModel.create({
      userId: operatorId,
      action: 'BILL_RETURN',
      entityType: 'Bill',
      entityId: bill._id,
      before: beforeState,
      after: afterState,
    });

    return {
      success: true,
      return: returnDoc,
      newFinalAmount: newFinal,
      newOutstanding,
    };
  }

  @Put(':id/cancel')
  @RequirePermissions('billing.cancel')
  async cancelBill(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Req() req: any,
  ) {
    const operatorId = new Types.ObjectId(req.user?.sub);
    const { reason } = body;

    if (!reason || !reason.trim()) {
      throw new BadRequestException('Cancellation reason is required');
    }

    const bill = await this.billModel.findById(id);
    if (!bill) {
      throw new NotFoundException('Bill not found');
    }

    if (bill.status === 'CANCELLED') {
      throw new BadRequestException('Bill is already cancelled');
    }

    const beforeState = bill.toJSON();

    // 1. Revert inventory items status back to IN_STOCK
    if (bill.itemsSnapshot && Array.isArray(bill.itemsSnapshot)) {
      for (const item of bill.itemsSnapshot) {
        if (item.barcode) {
          const updated = await this.inventoryModel.findOneAndUpdate(
            { barcode: item.barcode, status: 'SOLD' },
            { $set: { status: 'IN_STOCK' } },
            { new: true }
          );
          if (updated) {
            await this.historyModel.create({
              itemId: updated._id,
              previousStatus: 'SOLD',
              newStatus: 'IN_STOCK',
              reason: `Invoice ${bill.invoiceNumber} cancelled: ${reason || 'Manual cancellation'}`,
              userId: operatorId,
              billId: bill._id,
            });
          }
        }
      }
    }

    // 2. Void all active successful payments recorded for this bill (immutable ledger, set status to FAILED)
    await this.paymentModel.updateMany(
      { billId: bill._id, status: { $ne: 'FAILED' } },
      { $set: { status: 'FAILED', notes: `[CANCELLED INVOICE: ${reason}]` } },
    );

    // 3. Update bill status to CANCELLED
    bill.status = 'CANCELLED';
    bill.paymentSummary.outstandingAmount = 0;
    bill.notes = `[CANCELLED: ${reason}] ` + (bill.notes || '');
    bill.updatedBy = operatorId as any;
    await bill.save();

    // 4. Create Audit Log
    await this.auditModel.create({
      userId: operatorId,
      action: 'BILL_CANCEL',
      entityType: 'Bill',
      entityId: bill._id,
      before: beforeState,
      after: bill.toJSON(),
    });

    return bill;
  }
}

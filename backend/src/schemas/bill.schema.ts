import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from './user.schema';

@Schema({ _id: false })
export class CustomerSnapshot {
  @Prop({ type: MongooseSchema.Types.ObjectId })
  customerId?: MongooseSchema.Types.ObjectId;

  @Prop({ uppercase: true, trim: true })
  customerCode?: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  phone: string;

  @Prop({ uppercase: true, trim: true })
  gstin?: string;

  @Prop({ trim: true })
  address?: string;
}

@Schema({ _id: false })
export class RateItemSnapshot {
  @Prop({
    required: true,
    enum: ['GOLD', 'SILVER', 'PLATINUM'],
    uppercase: true,
  })
  metalType: string;

  @Prop({ required: true, trim: true })
  purity: string;

  @Prop({ required: true, min: 0 })
  ratePerGram: number;
}

@Schema({ _id: false })
export class RateSnapshot {
  @Prop({ type: [RateItemSnapshot], required: true })
  rates: RateItemSnapshot[];
}

@Schema({ _id: false })
export class BillItem {
  @Prop({ type: MongooseSchema.Types.ObjectId })
  productId?: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, trim: true })
  productName: string;

  @Prop({ uppercase: true, trim: true })
  sku?: string;

  @Prop({ trim: true })
  barcode?: string;

  @Prop({
    required: true,
    enum: ['GOLD', 'SILVER', 'PLATINUM'],
    uppercase: true,
  })
  metal: string;

  @Prop({ required: true, trim: true })
  purity: string;

  @Prop({ required: true, min: 0 })
  grossWeight: number;

  @Prop({ default: 0, min: 0 })
  stoneWeight: number;

  @Prop({ default: 0, min: 0 })
  otherWeight: number;

  @Prop({ required: true, min: 0 })
  netWeight: number;

  @Prop({ required: true, min: 0 })
  metalRate: number;

  @Prop({ required: true, min: 0 })
  metalValue: number;

  @Prop({
    required: true,
    enum: ['FIXED', 'PER_GRAM', 'PERCENTAGE'],
    uppercase: true,
  })
  makingChargeType: string;

  @Prop({ required: true, min: 0 })
  makingChargeRate: number;

  @Prop({ required: true, min: 0 })
  makingChargeAmount: number;

  @Prop({
    required: true,
    enum: ['PERCENTAGE', 'GRAMS', 'NONE'],
    default: 'NONE',
    uppercase: true,
  })
  wastageType: string;

  @Prop({ default: 0, min: 0 })
  wastageRate: number;

  @Prop({ default: 0, min: 0 })
  wastageAmount: number;

  @Prop({ default: 0, min: 0 })
  stoneCharge: number;

  @Prop({ default: 0, min: 0 })
  otherCharge: number;

  @Prop({ default: 0, min: 0 })
  discount: number;

  @Prop({ required: true, min: 0 })
  taxableAmount: number;

  @Prop({ required: true, min: 0 })
  tax: number;

  @Prop({ default: 0, min: 0 })
  cgst?: number;

  @Prop({ default: 0, min: 0 })
  sgst?: number;

  @Prop({ default: 0, min: 0 })
  igst?: number;

  @Prop({ required: true, min: 0 })
  finalAmount: number;
}

@Schema({ _id: false })
export class PricingSnapshot {
  @Prop({ required: true, min: 0 })
  subtotal: number;

  @Prop({ required: true, min: 0 })
  makingChargesTotal: number;

  @Prop({ required: true, min: 0 })
  wastageChargesTotal: number;

  @Prop({ required: true, min: 0 })
  stoneChargesTotal: number;

  @Prop({ required: true, min: 0 })
  otherChargesTotal: number;

  @Prop({ required: true, min: 0 })
  discountAmount: number;

  @Prop({ required: true, min: 0 })
  taxableAmount: number;

  @Prop({ required: true, min: 0 })
  taxAmount: number;

  @Prop({ default: 0, min: 0 })
  cgst?: number;

  @Prop({ default: 0, min: 0 })
  sgst?: number;

  @Prop({ default: 0, min: 0 })
  igst?: number;

  @Prop({ required: true, min: 0 })
  finalAmount: number;
}

@Schema({ _id: false })
export class PaymentSummary {
  @Prop({ required: true, min: 0, default: 0 })
  paidAmount: number;

  @Prop({ required: true, min: 0 })
  outstandingAmount: number;
}

@Schema({ timestamps: true })
export class Bill extends Document {
  @Prop({
    required: true,
    unique: true,
    index: true,
    uppercase: true,
    trim: true,
  })
  invoiceNumber: string;

  @Prop({ type: CustomerSnapshot, required: true })
  customerSnapshot: CustomerSnapshot;

  @Prop({ type: [BillItem], required: true })
  itemsSnapshot: BillItem[];

  @Prop({ type: RateSnapshot, required: true })
  rateSnapshot: RateSnapshot;

  @Prop({ type: PricingSnapshot, required: true })
  pricingSnapshot: PricingSnapshot;

  @Prop({ type: PaymentSummary, required: true })
  paymentSummary: PaymentSummary;

  @Prop({
    required: true,
    enum: [
      'DRAFT',
      'UNPAID',
      'PARTIALLY_PAID',
      'PAID',
      'OVERDUE',
      'CANCELLED',
      'RETURNED',
      'REFUNDED',
    ],
    default: 'DRAFT',
    index: true,
  })
  status: string;

  @Prop({ required: true, index: true })
  dueDate: Date;

  @Prop({ trim: true })
  notes?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  createdBy: MongooseSchema.Types.ObjectId | User;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  updatedBy?: MongooseSchema.Types.ObjectId | User;

  @Prop({ type: String, unique: true, sparse: true, index: true, trim: true })
  clientTxId?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const BillSchema = SchemaFactory.createForClass(Bill);

// Index for query/reporting by invoice date range
BillSchema.index({ createdAt: -1 });

// Item pre-validate hook for netWeight and metalValue calculations on subdocuments
BillSchema.pre('validate', function (next) {
  if (this.itemsSnapshot && Array.isArray(this.itemsSnapshot)) {
    this.itemsSnapshot.forEach((item) => {
      const gross = item.grossWeight || 0;
      const stone = item.stoneWeight || 0;
      const other = item.otherWeight || 0;
      item.netWeight = gross - stone - other;
      item.metalValue = item.netWeight * (item.metalRate || 0);
    });
  }
  next();
});

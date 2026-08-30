import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Bill } from './bill.schema';
import { Payment } from './payment.schema';
import { User } from './user.schema';

@Schema({ timestamps: true })
export class Refund extends Document {
  @Prop({
    required: true,
    unique: true,
    index: true,
    uppercase: true,
    trim: true,
  })
  refundId: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Bill',
    required: true,
    index: true,
  })
  billId: MongooseSchema.Types.ObjectId | Bill;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Payment', index: true })
  paymentId?: MongooseSchema.Types.ObjectId | Payment;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({
    required: true,
    enum: ['CASH', 'UPI', 'CARD', 'BANK_TRANSFER'],
    uppercase: true,
  })
  method: string;

  @Prop({ required: true, default: Date.now })
  refundDate: Date;

  @Prop({ trim: true })
  referenceNumber?: string;

  @Prop({ required: true, trim: true })
  reason: string;

  @Prop({
    required: true,
    enum: ['SUCCESS', 'FAILED'],
    default: 'SUCCESS',
  })
  status: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  processedBy: MongooseSchema.Types.ObjectId | User;
}

export const RefundSchema = SchemaFactory.createForClass(Refund);

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Bill } from './bill.schema';
import { Customer } from './customer.schema';
import { User } from './user.schema';

@Schema({ timestamps: true })
export class Payment extends Document {
  @Prop({
    required: true,
    unique: true,
    index: true,
    uppercase: true,
    trim: true,
  })
  paymentId: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Bill',
    required: true,
    index: true,
  })
  billId: MongooseSchema.Types.ObjectId | Bill;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Customer',
    required: true,
    index: true,
  })
  customerId: MongooseSchema.Types.ObjectId | Customer;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({
    required: true,
    enum: ['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'CHEQUE', 'OTHER'],
    uppercase: true,
    index: true,
  })
  method: string;

  @Prop({ required: true, default: Date.now, index: true })
  paymentDate: Date;

  @Prop({ trim: true })
  referenceNumber?: string;

  @Prop({ trim: true })
  notes?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  createdBy: MongooseSchema.Types.ObjectId | User;

  @Prop({
    required: true,
    enum: ['SUCCESS', 'FAILED', 'PENDING'],
    default: 'SUCCESS',
  })
  status: string;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Bill } from './bill.schema';
import { User } from './user.schema';

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class BillRevision extends Document {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Bill',
    required: true,
    index: true,
  })
  billId: MongooseSchema.Types.ObjectId | Bill;

  @Prop({ required: true, min: 1 })
  version: number;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  previousData: any;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  newData: any;

  @Prop({ type: [String], required: true })
  changedFields: string[];

  @Prop({ required: true, trim: true })
  reason: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  changedBy: MongooseSchema.Types.ObjectId | User;
}

export const BillRevisionSchema = SchemaFactory.createForClass(BillRevision);

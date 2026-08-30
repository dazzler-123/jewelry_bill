import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Bill } from './bill.schema';
import { InventoryItem } from './inventory-item.schema';
import { User } from './user.schema';

@Schema({ _id: false })
export class ReturnItem {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'InventoryItem' })
  inventoryItemId?: MongooseSchema.Types.ObjectId | InventoryItem;

  @Prop({ uppercase: true, trim: true })
  sku?: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, min: 0 })
  weight: number;

  @Prop({ required: true, min: 0 })
  value: number;
}

@Schema({ timestamps: true })
export class Return extends Document {
  @Prop({
    required: true,
    unique: true,
    index: true,
    uppercase: true,
    trim: true,
  })
  returnId: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Bill',
    required: true,
    index: true,
  })
  billId: MongooseSchema.Types.ObjectId | Bill;

  @Prop({ type: [ReturnItem], required: true })
  items: ReturnItem[];

  @Prop({ required: true, default: Date.now })
  returnDate: Date;

  @Prop({
    required: true,
    enum: ['PROCESSED', 'PENDING'],
    default: 'PROCESSED',
  })
  status: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  processedBy: MongooseSchema.Types.ObjectId | User;
}

export const ReturnSchema = SchemaFactory.createForClass(Return);

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { InventoryItem } from './inventory-item.schema';
import { User } from './user.schema';
import { Bill } from './bill.schema';

@Schema({ timestamps: true })
export class InventoryHistory extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'InventoryItem', required: true, index: true })
  itemId: MongooseSchema.Types.ObjectId | InventoryItem;

  @Prop({ required: true, enum: ['IN_STOCK', 'SOLD', 'RESERVED', 'RETURNED', 'DAMAGED'] })
  previousStatus: string;

  @Prop({ required: true, enum: ['IN_STOCK', 'SOLD', 'RESERVED', 'RETURNED', 'DAMAGED'] })
  newStatus: string;

  @Prop({ required: true, trim: true })
  reason: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: MongooseSchema.Types.ObjectId | User;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Bill', index: true })
  billId?: MongooseSchema.Types.ObjectId | Bill;
}

export const InventoryHistorySchema = SchemaFactory.createForClass(InventoryHistory);
export type InventoryHistoryDocument = InventoryHistory & Document;

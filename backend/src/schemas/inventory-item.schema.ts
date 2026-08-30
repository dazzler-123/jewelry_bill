import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Product } from './product.schema';

@Schema({ timestamps: true })
export class InventoryItem extends Document {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true,
  })
  productId: MongooseSchema.Types.ObjectId | Product;

  @Prop({ required: true, index: true, uppercase: true, trim: true })
  sku: string;

  @Prop({ required: true, unique: true, index: true, trim: true })
  barcode: string;

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

  @Prop({ min: 0 })
  purchasePrice?: number;

  @Prop({ min: 0 })
  sellingPrice?: number;

  @Prop({ min: 0 })
  makingCharge?: number;

  @Prop({ min: 0 })
  wastage?: number;

  @Prop({
    required: true,
    enum: ['IN_STOCK', 'SOLD', 'RESERVED', 'RETURNED', 'DAMAGED'],
    default: 'IN_STOCK',
    index: true,
  })
  status: string;

  @Prop({ trim: true })
  location?: string;
}

export const InventoryItemSchema = SchemaFactory.createForClass(InventoryItem);

// Enforce netWeight calculation: netWeight = grossWeight - stoneWeight - otherWeight
InventoryItemSchema.pre('validate', function (next) {
  const gross = this.grossWeight || 0;
  const stone = this.stoneWeight || 0;
  const other = this.otherWeight || 0;
  this.netWeight = gross - stone - other;
  next();
});

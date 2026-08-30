import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Product extends Document {
  @Prop({
    required: true,
    unique: true,
    index: true,
    uppercase: true,
    trim: true,
  })
  sku: string;

  @Prop({ required: true, unique: true, index: true, trim: true })
  barcode: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, index: true, trim: true })
  category: string;

  @Prop({
    required: true,
    enum: ['GOLD', 'SILVER', 'PLATINUM'],
    uppercase: true,
  })
  metal: string;

  @Prop({ required: true, trim: true })
  purity: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ default: 0, min: 0 })
  defaultMakingCharge: number;

  @Prop({ default: 0, min: 0 })
  defaultWastage: number;

  @Prop({ trim: true })
  stoneDetails?: string;

  @Prop({ default: true })
  active: boolean;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Customer extends Document {
  @Prop({
    required: true,
    unique: true,
    index: true,
    uppercase: true,
    trim: true,
  })
  customerCode: string;

  @Prop({ required: true, index: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, index: true, trim: true })
  phone: string;

  @Prop({ trim: true })
  alternatePhone?: string;

  @Prop({ lowercase: true, trim: true })
  email?: string;

  @Prop({ trim: true })
  address?: string;

  @Prop({ trim: true })
  city?: string;

  @Prop({ trim: true })
  state?: string;

  @Prop({ trim: true })
  pincode?: string;

  @Prop({ uppercase: true, trim: true })
  gstin?: string;

  @Prop({ trim: true })
  notes?: string;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);

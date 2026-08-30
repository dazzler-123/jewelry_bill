import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class ShopSettings extends Document {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  address: string;

  @Prop({ required: true, trim: true })
  phone: string;

  @Prop({ trim: true })
  alternatePhone?: string;

  @Prop({ lowercase: true, trim: true })
  email?: string;

  @Prop({ uppercase: true, trim: true })
  gstin?: string;

  @Prop({ uppercase: true, trim: true })
  pan?: string;

  @Prop({ required: true, default: 'INV-2026-', trim: true })
  invoicePrefix: string;

  @Prop({ trim: true })
  termsAndConditions?: string;

  @Prop({ trim: true })
  bankName?: string;

  @Prop({ trim: true })
  accountNumber?: string;

  @Prop({ trim: true })
  ifscCode?: string;

  @Prop({ trim: true })
  branchName?: string;

  @Prop({ trim: true })
  whatsappMessageTemplate?: string;

  @Prop({ trim: true })
  website?: string;

  @Prop({ trim: true })
  logoUrl?: string;

  @Prop({ trim: true })
  footerMessage?: string;

  @Prop({ required: true, default: 1001 })
  startingNumber: number;

  @Prop({ required: true, default: 'A4', trim: true })
  invoiceFormat: string; // 'A4' | '80mm' | '58mm'

  @Prop({ required: true, default: 'INR', trim: true })
  currency: string;

  @Prop({ required: true, default: 2 })
  decimalPrecision: number;

  @Prop({ required: true, default: 3 })
  weightPrecision: number;

  @Prop({ required: true, default: 1.5 })
  cgstRate: number;

  @Prop({ required: true, default: 1.5 })
  sgstRate: number;

  @Prop({ required: true, default: 3.0 })
  igstRate: number;

  @Prop({ required: true, default: 'UPI', trim: true })
  defaultPaymentMethod: string;

  @Prop({ required: true, default: 15 })
  defaultDuePeriod: number; // in days

  @Prop({ required: true, default: 0 })
  defaultMakingCharge: number;

  @Prop({ required: true, default: 0 })
  defaultWastage: number;

  @Prop({ required: true, default: 'HALF_UP', trim: true })
  roundingRule: string; // 'ROUND_UP' | 'ROUND_DOWN' | 'HALF_UP'

  @Prop({ required: true, default: 'light', trim: true })
  themePreference: string; // 'light' | 'dark'

  @Prop({ required: true, default: 'comfortable', trim: true })
  densityPreference: string; // 'compact' | 'comfortable'

  @Prop({ required: true, default: 'CLASSIC', trim: true })
  invoiceTemplate: string;
}

export const ShopSettingsSchema = SchemaFactory.createForClass(ShopSettings);

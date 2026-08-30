import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from './user.schema';

@Schema({ timestamps: true })
export class MetalRate extends Document {
  @Prop({
    required: true,
    enum: ['GOLD', 'SILVER', 'PLATINUM', 'OTHER'],
    uppercase: true,
  })
  metalType: string;

  @Prop({ required: true, trim: true })
  purity: string;

  @Prop({ required: true, min: 0 })
  ratePerGram: number;

  @Prop({ required: true, type: Date, default: Date.now })
  effectiveDate: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  updatedBy: MongooseSchema.Types.ObjectId | User;
}

export const MetalRateSchema = SchemaFactory.createForClass(MetalRate);

// Compound Unique Index to prevent duplicate rates for same metal, purity, and effective date
MetalRateSchema.index({ metalType: 1, purity: 1, effectiveDate: 1 }, { unique: true });

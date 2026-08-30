import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from './user.schema';

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class AuditLog extends Document {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId: MongooseSchema.Types.ObjectId | User;

  @Prop({ required: true, trim: true })
  action: string;

  @Prop({ required: true, trim: true })
  entityType: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  entityId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.Mixed })
  before?: any;

  @Prop({ type: MongooseSchema.Types.Mixed })
  after?: any;

  @Prop({ trim: true })
  reason?: string;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

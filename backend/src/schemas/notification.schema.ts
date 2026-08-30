import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from './user.schema';

@Schema({ timestamps: true })
export class Notification extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', index: true })
  userId?: MongooseSchema.Types.ObjectId | User;

  @Prop({ required: true, trim: true })
  message: string;

  @Prop({
    required: true,
    enum: ['INFO', 'WARNING', 'ALERT'],
    default: 'INFO',
    uppercase: true,
  })
  type: string;

  @Prop({ required: true, default: false })
  read: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

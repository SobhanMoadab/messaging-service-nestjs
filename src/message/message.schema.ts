import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Message extends Document {
  @Prop({ type: Types.ObjectId, required: true })
  senderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  recipientId: Types.ObjectId;

  @Prop({ required: true })
  content: string;

  @Prop({ default: false })
  isRead: boolean;

  @Prop({ default: false })
  isDelivered: boolean;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
MessageSchema.index({ senderId: 1, recipientId: 1, createdAt: -1 });

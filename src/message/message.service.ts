import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Message } from './message.schema';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { ClientProxy } from '@nestjs/microservices';
import { Redis } from 'ioredis';

@Injectable()
export class MessageService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<Message>,
    @InjectRedis() private readonly redis: Redis,
    @Inject('MESSAGE_QUEUE') private messageQueue: ClientProxy,
  ) {}

  async createMessage(
    senderId: string,
    recipientId: string,
    content: string,
  ): Promise<Message> {
    console.log({recipientId, senderId, content})
    const message = new this.messageModel({ senderId, recipientId, content });
    const savedMessage = await message.save();

    // Cache recent messages
    await this.cacheRecentMessage(senderId, recipientId, savedMessage);

    // Publish message to queue for processing
    this.messageQueue.emit('message_created', savedMessage);

    return savedMessage;
  }

  async getMessages(
    userId: string,
    otherUserId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<Message[]> {
    const skip = (page - 1) * limit;
    const cacheKey = `messages:${userId}:${otherUserId}:${page}`;

    // Try to get messages from cache
    const cachedMessages = await this.redis.get(cacheKey);
    if (cachedMessages) {
      return JSON.parse(cachedMessages);
    }

    // If not in cache, get from database
    const messages = await this.messageModel
      .find({
        $or: [
          { senderId: userId, recipientId: otherUserId },
          { senderId: otherUserId, recipientId: userId },
        ],
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();

    // Cache the result
    await this.redis.setex(cacheKey, 300, JSON.stringify(messages)); // Cache for 5 minutes

    return messages;
  }

  private async cacheRecentMessage(
    senderId: string,
    recipientId: string,
    message: Message,
  ): Promise<void> {
    const senderKey = `recent_messages:${senderId}`;
    const recipientKey = `recent_messages:${recipientId}`;

    await this.redis.lpush(senderKey, JSON.stringify(message));
    await this.redis.lpush(recipientKey, JSON.stringify(message));
    await this.redis.ltrim(senderKey, 0, 49); // Keep only the 50 most recent messages
    await this.redis.ltrim(recipientKey, 0, 49);
  }

  async markAsDelivered(messageId: string): Promise<void> {
    await this.messageModel.findByIdAndUpdate(messageId, { isDelivered: true });
  }

  async markAsRead(messageId: string): Promise<void> {
    await this.messageModel.findByIdAndUpdate(messageId, { isRead: true });
  }
}

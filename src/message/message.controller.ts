import { Controller, UseGuards } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Message } from './message.schema';
import { JwtAuthGuard } from 'src/jwt-auth.guard';

@Controller()
export class MessageController {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<Message>,
  ) {}


  @UseGuards(JwtAuthGuard)
  @MessagePattern({ cmd: 'create_message' })
  async createMessage(
    @Payload() data: { sender: string; recipient: string; content: string },
  ) {
    const newMessage = new this.messageModel(data);
    return await newMessage.save();
  }

  @UseGuards(JwtAuthGuard)
  @MessagePattern({ cmd: 'get_messages' })
  async getMessages(@Payload() data: { userId: string }) {
    return await this.messageModel
      .find({
        $or: [{ sender: data.userId }, { recipient: data.userId }],
      })
      .sort({ timestamp: -1 })
      .limit(50)
      .exec();
  }
}

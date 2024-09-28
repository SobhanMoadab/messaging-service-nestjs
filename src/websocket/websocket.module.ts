import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatGateway } from 'src/chat/chat.gateway';
import { MessageModule } from 'src/message/message.module';
import { MessageService } from 'src/message/message.service';

@Module({
    imports: [MessageModule],
    providers: [ChatGateway, MessageService, ConfigService],
})
export class WebSocketModule {}
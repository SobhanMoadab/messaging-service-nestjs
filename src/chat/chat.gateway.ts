import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessageService } from '../message/message.service';
import { Inject, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { JwtAuthGuard } from 'src/jwt-auth.guard';

export type AuthUser = {
  username: string;
  sub: string;
  iat: number;
  exp: number;
};

@UseGuards(JwtAuthGuard)
@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(
    private messageService: MessageService,
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
  ) {}

  async handleConnection(client: Socket) {
    console.log('Client is trying to connect:', client.id);

    // Extract the token from the handshake headers
    const token = this.extractTokenFromHeader(client.handshake.headers);

    if (!token) {
      console.log('No token provided. Connection denied.');
      client.disconnect(); // Disconnect the client if no token
      return;
    }

    // Validate the token
    try {
      const { sub }: AuthUser = await firstValueFrom(
        this.authClient.send({ cmd: 'validate_token' }, token),
      );

      if (!sub) {
        console.log('Invalid token. Connection denied.');
        client.disconnect(); // Disconnect the client if token is invalid
        return;
      }
      client.handshake.auth.userId = sub; // Assuming `sub` is the userId
      client.join(sub);
      console.log(`Client connected: ${sub}`);
    } catch (error) {
      console.error('Error validating token:', error);
      client.disconnect(); // Disconnect the client on error
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { recipient: string; content: string },
  ) {
    // Access the userId from the client
    const sender = client.handshake.auth.userId;

  const reqData = {
    recipient: payload.recipient,
    content: payload.content
  }
  console.log({reqData})

    const message = await this.messageService.createMessage(
      sender,
      reqData.recipient,
      reqData.content,
    );

    this.server.to(reqData.recipient).emit('create_message', message);
    return message;
  }

  private extractTokenFromHeader(headers: any): string | undefined {
    const [type, token] = headers.authorization?.split(' ') ?? [];
    console.log({ token });
    return type === 'Bearer' ? token : undefined;
  }
}

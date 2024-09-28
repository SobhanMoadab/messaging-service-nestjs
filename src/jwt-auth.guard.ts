import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Inject,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AuthUser } from './chat/chat.gateway';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      console.log('No token provided. Access denied.');
      return false;
    }

    try {
      const { sub } = await firstValueFrom(
        this.authClient.send<{ sub: string }>({ cmd: 'validate_token' }, token),
      );

      if (!sub) {
        console.log('Invalid token. Access denied.');
        return false;
      }

      return !!sub;
    } catch (error) {
      console.error('Error validating token:', error);
      return false;
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.handshake.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}

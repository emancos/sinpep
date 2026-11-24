import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const RATE_LIMIT_KEY = 'rate_limit_config';

export interface RateLimitConfig {
  max: number;
  windowMs: number;
}

export const RateLimit = (max: number, windowMs: number) =>
  SetMetadata(RATE_LIMIT_KEY, { max, windowMs } as RateLimitConfig);

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly hits = new Map<string, number[]>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const config = this.reflector.getAllAndOverride<RateLimitConfig>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!config) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const ip =
      (request.headers?.['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ||
      request.ip ||
      request.socket?.remoteAddress ||
      'unknown';
    const routeKey = `${request.method}:${request.route?.path || request.url}:${ip}`;

    const now = Date.now();
    const windowStart = now - config.windowMs;
    const timestamps = (this.hits.get(routeKey) || []).filter((ts) => ts > windowStart);

    if (timestamps.length >= config.max) {
      this.hits.set(routeKey, timestamps);
      throw new HttpException(
        'Muitas tentativas. Aguarde alguns instantes antes de tentar novamente.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    timestamps.push(now);
    this.hits.set(routeKey, timestamps);

    // Limpeza periódica para evitar crescimento ilimitado de memória
    if (this.hits.size > 5000) {
      for (const [key, list] of this.hits.entries()) {
        if (list.length === 0 || list[list.length - 1] < now - 15 * 60 * 1000) {
          this.hits.delete(key);
        }
      }
    }

    return true;
  }
}

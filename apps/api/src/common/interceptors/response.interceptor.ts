import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { randomUUID } from 'crypto';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const requestId = `req_${randomUUID().slice(0, 8)}`;

    return next.handle().pipe(
      map((data) => ({
        data,
        meta: { requestId },
      })),
    );
  }
}

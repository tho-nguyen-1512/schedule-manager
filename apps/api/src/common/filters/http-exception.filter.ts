import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { randomUUID } from 'crypto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof PrismaClientKnownRequestError) {
      return this.handlePrismaError(exception, response);
    }

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let details: Record<string, any> | undefined;

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (typeof exceptionResponse === 'object' && exceptionResponse) {
      const resp = exceptionResponse as Record<string, any>;
      message = resp.message ?? message;
      if (Array.isArray(resp.message)) {
        message = resp.message[0];
        details = { errors: resp.message };
      }
    }

    if (status === 400) code = 'VALIDATION_ERROR';
    else if (status === 404) code = 'NOT_FOUND';
    else if (status === 409) code = 'CONFLICT';

    response.status(status).json({
      error: { code, message, ...(details ? { details } : {}) },
      meta: { requestId: `req_${randomUUID().slice(0, 8)}` },
    });
  }

  private handlePrismaError(
    exception: PrismaClientKnownRequestError,
    response: Response,
  ) {
    const requestId = `req_${randomUUID().slice(0, 8)}`;

    switch (exception.code) {
      case 'P2003':
        response.status(HttpStatus.CONFLICT).json({
          error: {
            code: 'CONFLICT',
            message:
              'Cannot delete this record because other records depend on it',
          },
          meta: { requestId },
        });
        break;
      case 'P2002':
        response.status(HttpStatus.CONFLICT).json({
          error: {
            code: 'CONFLICT',
            message: 'A record with this value already exists',
          },
          meta: { requestId },
        });
        break;
      case 'P2025':
        response.status(HttpStatus.NOT_FOUND).json({
          error: { code: 'NOT_FOUND', message: 'Record not found' },
          meta: { requestId },
        });
        break;
      default:
        response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected database error occurred',
          },
          meta: { requestId },
        });
    }
  }
}

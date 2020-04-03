import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Interceptor that logs input/output requests
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly ctxPrefix: string = LoggingInterceptor.name;
  private readonly logger: Logger = new Logger(this.ctxPrefix);

  /**
   * Intercept method, logs before and after the request being processed
   * @param context details about the current request
   * @param call$ implements the handle method that returns an Observable
   */
  public intercept(context: ExecutionContext, call$: CallHandler): Observable<unknown> {
    const req: Request = context.switchToHttp().getRequest();
    const { method, url, body, headers } = req;
    const message: string = `${this.ctxPrefix} - ${method} - ${url}`;

    this.logger.log(message);
    this.logger.debug(
      {
        message,
        method,
        body,
        headers,
      },
      message,
    );

    return call$.handle().pipe(
      tap({
        next: (val: unknown): void => {
          this.logNext(val, context);
        },
        error: (err: HttpException): void => {
          this.logError(err, context);
        },
      }),
    );
  }

  /**
   * Logs the request response in success cases
   * @param body body returned
   * @param context details about the current request
   */
  private logNext(body: unknown, context: ExecutionContext): void {
    const req: Request = context.switchToHttp().getRequest<Request>();
    const res: Response = context.switchToHttp().getResponse<Response>();
    const { method, url } = req;
    const { statusCode } = res;
    const resCtx: string = `${this.ctxPrefix} - ${statusCode} - ${method} - ${url}`;

    this.logger.log(resCtx);
    this.logger.debug(
      {
        message: resCtx,
        body,
      },
      resCtx,
    );
  }

  /**
   * Logs the request response in success cases
   * @param error Error object
   * @param context details about the current request
   */
  private logError(error: HttpException, context: ExecutionContext): void {
    const req: Request = context.switchToHttp().getRequest<Request>();
    const { method, url, body } = req;
    const statusCode: number = error.getStatus();
    const ctx: string = `${this.ctxPrefix} - ${statusCode} - ${method} - ${url}`;
    // tslint:disable-next-line: prefer-conditional-expression
    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        {
          method,
          url,
          body,
          message: ctx,
        },
        error.stack,
        ctx,
      );
    } else {
      this.logger.warn(
        {
          method,
          url,
          error,
          body,
          message: ctx,
        },
        ctx,
      );
    }
  }
}
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

interface ExceptionPayload {
  message?: string | string[];
  code?: string;
  details?: unknown[];
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse();
      const payload: ExceptionPayload =
        typeof raw === 'string' ? { message: raw } : (raw as ExceptionPayload);

      // El ValidationPipe entrega message como array. El cliente hace
      // `new Error(body.message)`, asi que un array llegaria como "a,b".
      const messages = normalizeMessages(payload.message ?? exception.message);

      response.status(status).json({
        message: messages.join(' ') || exception.message,
        // Se respeta el code que puso quien lanzo la excepcion; solo si no hay
        // ninguno se cae al generico. Las fases posteriores dependen de poder
        // distinguir el motivo (p. ej. OUTSIDE_WORK_SCHEDULE) y no solo el 403.
        code: payload.code ?? `HTTP_${status}`,
        details: payload.details ?? (messages.length > 1 ? messages : []),
      });
      return;
    }

    const databaseError = exception as { code?: string; message?: string };
    if (databaseError?.code === 'P0001' && /Limit|Feature|cupo/i.test(databaseError.message ?? '')) {
      response.status(409).json({ message: 'El plan no permite esta operación o se alcanzó el cupo contratado.', code: 'PLAN_LIMIT', details: [] });
      return;
    }
    console.error('[ApiExceptionFilter] Unhandled exception:', exception);
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: 'Error interno del servidor',
      code: 'INTERNAL_ERROR',
      details: [],
    });
  }
}

const normalizeMessages = (message: string | string[]): string[] => {
  if (Array.isArray(message)) {
    return message.filter((item): item is string => typeof item === 'string' && item.length > 0);
  }
  return typeof message === 'string' && message.length > 0 ? [message] : [];
};

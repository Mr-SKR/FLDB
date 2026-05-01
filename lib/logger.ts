/**
 * Structured Logger Abstraction
 * Currently wraps console.log but provides a consistent interface for future pino/winston integration.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogPayload {
  message: string;
  level: LogLevel;
  timestamp: string;
  context?: string;
  data?: unknown;
  error?: {
    message: string;
    stack?: string;
    code?: string | number;
  };
}

const formatLog = (level: LogLevel, message: string, context?: string, data?: unknown): LogPayload => {
  return {
    message,
    level,
    timestamp: new Date().toISOString(),
    context,
    data,
  };
};

export const logger = {
  info: (message: string, context?: string, data?: unknown) => {
    console.log(JSON.stringify(formatLog('info', message, context, data)));
  },
  warn: (message: string, context?: string, data?: unknown) => {
    console.warn(JSON.stringify(formatLog('warn', message, context, data)));
  },
  error: (message: string, context?: string, error?: unknown, data?: unknown) => {
    const payload = formatLog('error', message, context, data);
    if (error instanceof Error) {
      payload.error = {
        message: error.message,
        stack: error.stack,
      };
    } else if (error) {
      payload.error = { message: String(error) };
    }
    console.error(JSON.stringify(payload));
  },
  debug: (message: string, context?: string, data?: unknown) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(JSON.stringify(formatLog('debug', message, context, data)));
    }
  },
};

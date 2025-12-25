import type { Plugin, PluginContext, HttpResponse, HttpError } from '@fetchmax/core';

export interface LoggerConfig {
  /** Log requests (default: true) */
  logRequests?: boolean;
  /** Log responses (default: true) */
  logResponses?: boolean;
  /** Log errors (default: true) */
  logErrors?: boolean;
  /** Show detailed information (default: false) */
  verbose?: boolean;
  /** Use colors in console output (default: true) */
  colors?: boolean;
  /** Log request headers (default: false) */
  logHeaders?: boolean;
  /** Log request body (default: false) */
  logRequestBody?: boolean;
  /** Log response data (default: false) */
  logResponseData?: boolean;
  /** Filter function to determine which requests to log */
  filter?: (request: any) => boolean;
  /** Custom logger function */
  logger?: {
    log: (...args: any[]) => void;
    error: (...args: any[]) => void;
    group?: (...args: any[]) => void;
    groupEnd?: () => void;
  };
  /** Custom log function (shorthand for logger.log) */
  log?: (message: string) => void;
}

/**
 * Logger Plugin
 *
 * Logs HTTP requests, responses, and errors to the console for debugging.
 *
 * @example
 * ```ts
 * const client = new HttpClient().use(loggerPlugin({
 *   verbose: true,
 *   filter: (request) => !request.url.includes('/health')
 * }));
 * ```
 */
export function loggerPlugin(config: LoggerConfig = {}): Plugin {
  const {
    logRequests = true,
    logResponses = true,
    logErrors = true,
    verbose = false,
    colors = true,
    logHeaders = false,
    logRequestBody = false,
    logResponseData = false,
    filter,
    logger: customLogger,
    log: customLog
  } = config;

  // Use custom log function if provided, otherwise use logger
  const logger = customLog ? {
    log: customLog,
    error: customLog,
    group: undefined,
    groupEnd: undefined
  } : (customLogger || console);

  const emoji = {
    request: '🚀',
    success: '✅',
    error: '❌',
    redirect: '↪️',
    info: 'ℹ️',
    warning: '⚠️'
  };

  /**
   * Check if request should be logged
   */
  function shouldLog(request: any): boolean {
    return !filter || filter(request);
  }

  /**
   * Format duration in human-readable format
   */
  function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }

  /**
   * Format bytes in human-readable format
   */
  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }

  /**
   * Redact sensitive data from objects
   */
  function redactSensitiveData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => redactSensitiveData(item));
    }

    const redacted: any = {};
    const sensitiveKeys = ['password', 'pass', 'pwd', 'secret', 'apikey', 'api_key', 'token', 'accesstoken', 'access_token'];

    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();

      // Redact sensitive field names
      if (sensitiveKeys.includes(lowerKey)) {
        redacted[key] = '[REDACTED]';
        continue;
      }

      // Redact credit card numbers (various formats)
      if (typeof value === 'string') {
        // Check for credit card patterns (with or without dashes/spaces)
        const ccPattern = /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g;
        if (ccPattern.test(value)) {
          redacted[key] = '[REDACTED-CC]';
          continue;
        }

        // Check for SSN patterns (XXX-XX-XXXX)
        const ssnPattern = /\b\d{3}-\d{2}-\d{4}\b/g;
        if (ssnPattern.test(value)) {
          redacted[key] = '[REDACTED-SSN]';
          continue;
        }
      }

      // Recursively redact nested objects
      if (typeof value === 'object' && value !== null) {
        redacted[key] = redactSensitiveData(value);
      } else {
        redacted[key] = value;
      }
    }

    return redacted;
  }

  /**
   * Redact sensitive headers
   */
  function redactHeaders(headers: any): any {
    if (!headers || typeof headers !== 'object') {
      return headers;
    }

    const redacted: any = {};
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'api-key'];

    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase();

      if (sensitiveHeaders.includes(lowerKey)) {
        // Show last 4 characters for debugging
        if (typeof value === 'string' && value.length > 4) {
          redacted[key] = `***${value.slice(-4)}`;
        } else {
          redacted[key] = '[REDACTED]';
        }
      } else {
        redacted[key] = value;
      }
    }

    return redacted;
  }

  /**
   * Get color based on status code
   */
  function getStatusColor(status: number): string {
    if (!colors) return '';

    if (status >= 200 && status < 300) return '\x1b[32m'; // Green
    if (status >= 300 && status < 400) return '\x1b[36m'; // Cyan
    if (status >= 400 && status < 500) return '\x1b[33m'; // Yellow
    if (status >= 500) return '\x1b[31m'; // Red
    return '\x1b[0m'; // Reset
  }

  const resetColor = colors ? '\x1b[0m' : '';
  const boldColor = colors ? '\x1b[1m' : '';

  return {
    name: 'logger',

    async onRequest(request: any, _context: PluginContext) {
      // Store start time
      request.__startTime = Date.now();

      if (!logRequests || !shouldLog(request)) {
        request.__skipLogging = true;
        return request;
      }

      const method = request.method?.toUpperCase() || 'GET';
      const url = request.url || '';

      if (logger.group) {
        logger.group(`${emoji.request} ${boldColor}${method}${resetColor} ${url}`);
      } else {
        logger.log(`${emoji.request} ${boldColor}${method}${resetColor} ${url}`);
      }

      if (verbose || logHeaders || logRequestBody) {
        if ((verbose || logHeaders) && request.headers && Object.keys(request.headers).length > 0) {
          const redactedHeaders = redactHeaders(request.headers);
          logger.log('  Headers: ' + JSON.stringify(redactedHeaders));
        }
        if (verbose && request.params && Object.keys(request.params).length > 0) {
          logger.log('  Params: ' + JSON.stringify(request.params));
        }
        if ((verbose || logRequestBody) && request.body) {
          const redactedBody = redactSensitiveData(request.body);
          logger.log('  Body: ' + JSON.stringify(redactedBody));
        }
      }

      if (logger.groupEnd) {
        logger.groupEnd();
      }

      return request;
    },

    async onResponse(response: HttpResponse, request: any, _context: PluginContext) {
      // Skip if logging was disabled for this request
      if (request.__skipLogging) {
        return response;
      }

      if (!logResponses || !shouldLog(request)) {
        return response;
      }

      const duration = Date.now() - (request.__startTime || Date.now());
      const method = request.method?.toUpperCase() || 'GET';
      const url = request.url || '';
      const status = response.status;
      const statusColor = getStatusColor(status);

      // Determine icon based on status
      let icon = emoji.success;
      if (status >= 300 && status < 400) icon = emoji.redirect;
      else if (status >= 400) icon = emoji.error;

      const statusText = `${statusColor}${status} ${response.statusText}${resetColor}`;
      const durationText = formatDuration(duration);

      if (logger.group) {
        logger.group(
          `${icon} ${statusText} ${boldColor}${method}${resetColor} ${url} ${emoji.info} ${durationText}`
        );
      } else {
        logger.log(
          `${icon} ${statusText} ${boldColor}${method}${resetColor} ${url} ${emoji.info} ${durationText}`
        );
      }

      if (verbose || logResponseData) {
        if (verbose) {
          logger.log('  Status: ' + status + ' ' + response.statusText);
        }

        // Log response headers
        if (verbose) {
          const headers: Record<string, string> = {};
          response.headers.forEach((value, key) => {
            headers[key] = value;
          });
          if (Object.keys(headers).length > 0) {
            logger.log('  Headers: ' + JSON.stringify(headers));
          }

          // Log response size
          const contentLength = response.headers.get('content-length');
          if (contentLength) {
            logger.log('  Size: ' + formatBytes(parseInt(contentLength, 10)));
          }
        }

        // Log response data (truncated if large)
        if ((verbose || logResponseData) && response.data) {
          const redactedData = redactSensitiveData(response.data);
          const dataStr = JSON.stringify(redactedData);
          if (dataStr.length > 1000) {
            logger.log('  Data: ' + dataStr.substring(0, 1000) + '... (truncated)');
          } else {
            logger.log('  Data: ' + dataStr);
          }
        }
      }

      if (logger.groupEnd) {
        logger.groupEnd();
      }

      return response;
    },

    async onError(error: HttpError, request: any, _context: PluginContext) {
      // Skip if logging was disabled for this request
      if (request.__skipLogging) {
        throw error;
      }

      if (!logErrors || !shouldLog(request)) {
        throw error;
      }

      const duration = Date.now() - (request.__startTime || Date.now());
      const method = request.method?.toUpperCase() || 'GET';
      const url = request.url || '';
      const durationText = formatDuration(duration);

      const statusText = error.status
        ? `${getStatusColor(error.status)}${error.status} ${error.statusText}${resetColor}`
        : `${emoji.error} ERROR`;

      if (logger.group) {
        logger.group(
          `${emoji.error} ${statusText} ${boldColor}${method}${resetColor} ${url} ${emoji.info} ${durationText}`
        );
      } else {
        logger.error(
          `${emoji.error} ${statusText} ${boldColor}${method}${resetColor} ${url} ${emoji.info} ${durationText}`
        );
      }

      logger.error('  Error: ' + error.message);

      if (verbose) {
        if (error.code) {
          logger.error('  Code: ' + error.code);
        }

        if (error.data) {
          logger.error('  Data: ' + JSON.stringify(error.data));
        }

        if (error.stack) {
          logger.error('  Stack: ' + error.stack);
        }

        if (error.config) {
          logger.error('  Config: ' + JSON.stringify(error.config));
        }
      }

      if (logger.groupEnd) {
        logger.groupEnd();
      }

      throw error;
    }
  };
}

export default loggerPlugin;

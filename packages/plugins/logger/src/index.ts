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
  /** Filter function to determine which requests to log */
  filter?: (request: any) => boolean;
  /** Custom logger function */
  logger?: {
    log: (...args: any[]) => void;
    error: (...args: any[]) => void;
    group?: (...args: any[]) => void;
    groupEnd?: () => void;
  };
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
    filter,
    logger = console
  } = config;

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

      if (verbose) {
        if (request.headers && Object.keys(request.headers).length > 0) {
          logger.log('  Headers:', request.headers);
        }
        if (request.params && Object.keys(request.params).length > 0) {
          logger.log('  Params:', request.params);
        }
        if (request.body) {
          logger.log('  Body:', request.body);
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

      if (verbose) {
        logger.log('  Status:', status, response.statusText);

        // Log response headers
        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });
        if (Object.keys(headers).length > 0) {
          logger.log('  Headers:', headers);
        }

        // Log response size
        const contentLength = response.headers.get('content-length');
        if (contentLength) {
          logger.log('  Size:', formatBytes(parseInt(contentLength, 10)));
        }

        // Log response data (truncated if large)
        if (response.data) {
          const dataStr = JSON.stringify(response.data);
          if (dataStr.length > 1000) {
            logger.log('  Data:', dataStr.substring(0, 1000) + '... (truncated)');
          } else {
            logger.log('  Data:', response.data);
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

      logger.error('  Error:', error.message);

      if (verbose) {
        if (error.code) {
          logger.error('  Code:', error.code);
        }

        if (error.data) {
          logger.error('  Data:', error.data);
        }

        if (error.stack) {
          logger.error('  Stack:', error.stack);
        }

        if (error.config) {
          logger.error('  Config:', error.config);
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

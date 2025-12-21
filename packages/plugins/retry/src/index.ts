import type { Plugin, PluginContext, HttpError } from '@fetchmax/core';

export interface RetryConfig {
  /** Maximum number of retries (default: 3) */
  maxRetries?: number;
  /** Base delay between retries in milliseconds (default: 1000) */
  retryDelay?: number;
  /** HTTP status codes to retry on (default: [408, 429, 500, 502, 503, 504]) */
  retryOn?: number[];
  /** Custom function to determine if request should be retried */
  shouldRetry?: (error: HttpError, attempt: number) => boolean;
  /** Backoff strategy: 'exponential' or 'linear' (default: 'exponential') */
  backoff?: 'exponential' | 'linear';
  /** Callback called before each retry */
  onRetry?: (attempt: number, error: HttpError, delay: number) => void;
  /** HTTP methods to retry (default: ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE']) */
  methods?: string[];
}

/**
 * Retry Plugin
 *
 * Automatically retries failed requests with configurable strategies.
 *
 * @example
 * ```ts
 * const client = new HttpClient().use(retryPlugin({
 *   maxRetries: 3,
 *   retryDelay: 1000,
 *   backoff: 'exponential'
 * }));
 * ```
 */
export function retryPlugin(config: RetryConfig = {}): Plugin {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    retryOn = [408, 429, 500, 502, 503, 504],
    backoff = 'exponential',
    shouldRetry: customShouldRetry,
    onRetry,
    methods = ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE']
  } = config;

  return {
    name: 'retry',

    async onError(error: HttpError, request: any, context: PluginContext) {
      // Check if request has been aborted
      if (request.signal && request.signal.aborted) {
        throw error;
      }

      // Get current retry attempt
      const attempt = context.retryCount || 0;

      // Check if we've exceeded max retries
      if (attempt >= maxRetries) {
        throw error;
      }

      // Check if method is retryable
      const method = request.method?.toUpperCase();
      if (!methods.includes(method)) {
        throw error;
      }

      // Determine if we should retry
      let shouldRetryRequest = false;

      if (customShouldRetry) {
        // Use custom retry logic
        shouldRetryRequest = customShouldRetry(error, attempt);
      } else {
        // Default retry logic
        if (error.status && retryOn.includes(error.status)) {
          shouldRetryRequest = true;
        } else if (
          error.code === 'NETWORK_ERROR' ||
          error.code === 'TIMEOUT_ERROR' ||
          error.name === 'NetworkError' ||
          error.name === 'TimeoutError'
        ) {
          shouldRetryRequest = true;
        }
      }

      if (!shouldRetryRequest) {
        throw error;
      }

      // Calculate delay based on backoff strategy
      let delayMs: number;
      if (backoff === 'exponential') {
        delayMs = retryDelay * Math.pow(2, attempt);
      } else {
        delayMs = retryDelay * (attempt + 1);
      }

      // Call onRetry callback
      if (onRetry) {
        onRetry(attempt + 1, error, delayMs);
      } else {
        console.log(
          `[Retry] Attempt ${attempt + 1}/${maxRetries} after ${delayMs}ms - ${error.message}`
        );
      }

      // Wait before retrying, but check for abort signal
      await new Promise<void>((resolve, reject) => {
        // Declare abortListener before use
        let abortListener: (() => void) | undefined;

        const timeoutId = setTimeout(() => {
          if (abortListener && request.signal) {
            request.signal.removeEventListener('abort', abortListener);
          }
          resolve();
        }, delayMs);

        // Listen for abort during delay
        if (request.signal && typeof request.signal.addEventListener === 'function') {
          abortListener = () => {
            clearTimeout(timeoutId);
            const abortError: any = new Error('Request aborted during retry delay');
            abortError.name = 'AbortError';
            abortError.code = 'ABORT_ERROR';
            reject(abortError);
          };
          request.signal.addEventListener('abort', abortListener);
        }
      });

      // Check again if aborted after delay
      if (request.signal && request.signal.aborted) {
        const abortError: any = new Error('Request aborted');
        abortError.name = 'AbortError';
        abortError.code = 'ABORT_ERROR';
        throw abortError;
      }

      // Increment retry count in context
      context.retryCount = attempt + 1;

      // Signal that we want to retry the request
      return { retry: true };
    }
  };
}

export default retryPlugin;

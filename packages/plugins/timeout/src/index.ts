import type { Plugin, PluginContext } from '@fetchmax/core';
import { TimeoutError, AbortError } from '@fetchmax/core';

export interface TimeoutConfig {
  /** Timeout in milliseconds */
  timeout: number;
  /** Custom timeout error message */
  message?: string;
}

/**
 * Timeout Plugin
 *
 * Sets a timeout for all requests. Requests that take longer than the specified
 * timeout will be aborted and throw a TimeoutError.
 *
 * @example
 * ```ts
 * const client = new HttpClient().use(timeoutPlugin({
 *   timeout: 5000, // 5 seconds
 *   message: 'Request timed out'
 * }));
 *
 * // Override timeout per request
 * await client.get('/api/data', { timeout: 10000 });
 * ```
 */
export function timeoutPlugin(config: TimeoutConfig): Plugin {
  const { timeout: defaultTimeout, message } = config;

  return {
    name: 'timeout',

    async onRequest(request: any, context: PluginContext) {
      // Get timeout from request config or use default
      const timeout = request.timeout || defaultTimeout;

      if (!timeout || timeout <= 0) {
        return request;
      }

      // Create AbortController if not already present
      if (!request.signal) {
        const controller = new AbortController();
        request.signal = controller.signal;
        request.__abortController = controller;
      }

      // Set timeout
      const timeoutId = setTimeout(() => {
        // Mark that timeout has fired
        request.__timeoutFired = true;

        if (request.__abortController) {
          request.__abortController.abort();
        }
      }, timeout);

      // Store timeout ID and value for cleanup and error handling
      request.__timeoutId = timeoutId;
      request.__timeoutValue = timeout;

      return request;
    },

    async onResponse(response: any, request: any, context: PluginContext) {
      // Clear timeout on successful response
      if (request.__timeoutId) {
        clearTimeout(request.__timeoutId);
        request.__timeoutFired = false; // Reset flag
      }

      return response;
    },

    async onError(error: any, request: any, context: PluginContext) {
      console.log('[TIMEOUT DEBUG] request.__timeoutFired:', request.__timeoutFired);
      console.log('[TIMEOUT DEBUG] request.__timeoutValue:', request.__timeoutValue);
      console.log('[TIMEOUT DEBUG] error:', error.constructor.name);

      // Don't clear timeout here - we need to know if it fired

      // Check if this was a timeout by seeing if timeout fired
      // We check if __timeoutFired flag is set (will be set by timeout callback)
      if (request.__timeoutFired) {
        throw new TimeoutError(
          message || `Request timeout after ${request.__timeoutValue}ms`,
          request
        );
      }

      // Clear timeout if it didn't fire (request failed for other reasons)
      if (request.__timeoutId) {
        clearTimeout(request.__timeoutId);
      }

      throw error;
    }
  };
}

export default timeoutPlugin;

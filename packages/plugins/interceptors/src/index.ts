import type { Plugin, PluginContext, HttpResponse, HttpError } from '@fetchmax/core';

export type RequestInterceptor = (config: any) => any | Promise<any>;
export type ResponseInterceptor = (response: HttpResponse) => HttpResponse | Promise<HttpResponse>;
export type ErrorInterceptor = (error: HttpError) => any | Promise<any>;

export type InterceptorEject = () => void;

/**
 * Interceptors Plugin
 *
 * Allows modifying requests before they are sent and responses before they are returned.
 *
 * @example
 * ```ts
 * const interceptors = interceptorPlugin();
 * const client = new HttpClient().use(interceptors);
 *
 * // Add authentication header to all requests
 * interceptors.request.use((config) => {
 *   config.headers = {
 *     ...config.headers,
 *     'Authorization': `Bearer ${getToken()}`
 *   };
 *   return config;
 * });
 *
 * // Transform all responses
 * interceptors.response.use((response) => {
 *   response.data = camelCaseKeys(response.data);
 *   return response;
 * });
 *
 * // Handle errors globally
 * interceptors.error.use(async (error) => {
 *   if (error.status === 401) {
 *     await refreshToken();
 *     return client.request(error.config);
 *   }
 *   throw error;
 * });
 * ```
 */
export function interceptorPlugin(): Plugin & {
  request: {
    use: (interceptor: RequestInterceptor) => InterceptorEject;
    eject: (interceptor: RequestInterceptor) => void;
    clear: () => void;
  };
  response: {
    use: (interceptor: ResponseInterceptor) => InterceptorEject;
    eject: (interceptor: ResponseInterceptor) => void;
    clear: () => void;
  };
  error: {
    use: (interceptor: ErrorInterceptor) => InterceptorEject;
    eject: (interceptor: ErrorInterceptor) => void;
    clear: () => void;
  };
} {
  const requestInterceptors: RequestInterceptor[] = [];
  const responseInterceptors: ResponseInterceptor[] = [];
  const errorInterceptors: ErrorInterceptor[] = [];

  const plugin: any = {
    name: 'interceptors',

    /**
     * Request interceptors API
     */
    request: {
      /**
       * Add a request interceptor
       */
      use(interceptor: RequestInterceptor): InterceptorEject {
        requestInterceptors.push(interceptor);
        return () => {
          const index = requestInterceptors.indexOf(interceptor);
          if (index > -1) {
            requestInterceptors.splice(index, 1);
          }
        };
      },

      /**
       * Remove a request interceptor
       */
      eject(interceptor: RequestInterceptor): void {
        const index = requestInterceptors.indexOf(interceptor);
        if (index > -1) {
          requestInterceptors.splice(index, 1);
        }
      },

      /**
       * Clear all request interceptors
       */
      clear(): void {
        requestInterceptors.length = 0;
      }
    },

    /**
     * Response interceptors API
     */
    response: {
      /**
       * Add a response interceptor
       */
      use(interceptor: ResponseInterceptor): InterceptorEject {
        responseInterceptors.push(interceptor);
        return () => {
          const index = responseInterceptors.indexOf(interceptor);
          if (index > -1) {
            responseInterceptors.splice(index, 1);
          }
        };
      },

      /**
       * Remove a response interceptor
       */
      eject(interceptor: ResponseInterceptor): void {
        const index = responseInterceptors.indexOf(interceptor);
        if (index > -1) {
          responseInterceptors.splice(index, 1);
        }
      },

      /**
       * Clear all response interceptors
       */
      clear(): void {
        responseInterceptors.length = 0;
      }
    },

    /**
     * Error interceptors API
     */
    error: {
      /**
       * Add an error interceptor
       */
      use(interceptor: ErrorInterceptor): InterceptorEject {
        errorInterceptors.push(interceptor);
        return () => {
          const index = errorInterceptors.indexOf(interceptor);
          if (index > -1) {
            errorInterceptors.splice(index, 1);
          }
        };
      },

      /**
       * Remove an error interceptor
       */
      eject(interceptor: ErrorInterceptor): void {
        const index = errorInterceptors.indexOf(interceptor);
        if (index > -1) {
          errorInterceptors.splice(index, 1);
        }
      },

      /**
       * Clear all error interceptors
       */
      clear(): void {
        errorInterceptors.length = 0;
      }
    },

    /**
     * Plugin hook: Run all request interceptors
     */
    async onRequest(request: any, context: PluginContext) {
      let modifiedRequest = request;

      for (const interceptor of requestInterceptors) {
        try {
          modifiedRequest = await interceptor(modifiedRequest);
        } catch (error) {
          console.error('[Interceptors] Error in request interceptor:', error);
          throw error;
        }
      }

      return modifiedRequest;
    },

    /**
     * Plugin hook: Run all response interceptors
     */
    async onResponse(response: HttpResponse, request: any, context: PluginContext) {
      let modifiedResponse = response;

      for (const interceptor of responseInterceptors) {
        try {
          modifiedResponse = await interceptor(modifiedResponse);
        } catch (error) {
          console.error('[Interceptors] Error in response interceptor:', error);
          throw error;
        }
      }

      return modifiedResponse;
    },

    /**
     * Plugin hook: Run all error interceptors
     */
    async onError(error: HttpError, request: any, context: PluginContext) {
      let currentError: any = error;

      for (const interceptor of errorInterceptors) {
        try {
          const result = await interceptor(currentError);

          // If interceptor returns a value, use it
          if (result !== undefined) {
            // If it's a response object, return it (successful recovery)
            if (result && typeof result === 'object' && 'data' in result) {
              return result;
            }

            // Otherwise, update the error
            currentError = result;
          }
        } catch (interceptorError: any) {
          console.error('[Interceptors] Error in error interceptor:', interceptorError);
          currentError = interceptorError;
        }
      }

      // If error was not handled, throw it
      throw currentError;
    }
  };

  return plugin;
}

export default interceptorPlugin;

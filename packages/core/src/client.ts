import type {
  RequestConfig,
  HttpResponse,
  Plugin,
  PluginContext,
  IHttpClient,
  HttpClientConfig
} from './types';
import {
  HttpError,
  NetworkError,
  AbortError,
  createHttpError,
  ParseError
} from './errors';
import {
  buildURL,
  mergeConfig,
  prepareBody,
  parseResponse,
  deepClone
} from './utils';

/**
 * FetchMax HttpClient
 *
 * The core HTTP client with plugin support
 */
export class HttpClient implements IHttpClient {
  private config: HttpClientConfig;
  private plugins: Plugin[] = [];

  constructor(config: HttpClientConfig = {}) {
    this.config = config;
    this.plugins = config.plugins || [];
  }

  /**
   * Add a plugin to the client
   */
  use(plugin: Plugin): IHttpClient {
    // Check for duplicate plugin names
    if (this.plugins.find(p => p.name === plugin.name)) {
      console.warn(`Plugin "${plugin.name}" is already registered. Skipping.`);
      return this;
    }

    this.plugins.push(plugin);

    // Copy plugin methods to client (except hooks)
    const hookNames = ['onRequest', 'onResponse', 'onError', 'name'];
    Object.keys(plugin).forEach(key => {
      if (!hookNames.includes(key) && typeof (plugin as any)[key] === 'function') {
        (this as any)[key] = (plugin as any)[key].bind(plugin);
        // Inject 'this' reference to allow plugins to call client methods
        if ((plugin as any)[key].length > 0) {
          (this as any)[key] = (...args: any[]) => (plugin as any)[key].call(plugin, this, ...args);
        }
      }
    });

    return this;
  }

  /**
   * Create a new client instance with custom config
   */
  create(config?: HttpClientConfig): IHttpClient {
    const mergedConfig = mergeConfig(this.config, config);
    const newClient = new HttpClient(mergedConfig);

    // Copy plugins to new instance
    this.plugins.forEach(plugin => newClient.use(plugin));

    return newClient;
  }

  /**
   * Make a generic HTTP request
   */
  async request<T = any>(config: RequestConfig): Promise<HttpResponse<T>> {
    // Merge with default config
    const finalConfig = mergeConfig(this.config, config);

    // Create plugin context (or reuse existing one for retries)
    const context: PluginContext = (finalConfig as any)._retryContext || {};

    // Clean up the temporary _retryContext property
    if ((finalConfig as any)._retryContext) {
      delete (finalConfig as any)._retryContext;
    }

    // Initialize requestConfig so it's in scope for catch block
    let requestConfig = finalConfig;

    try {
      // Run onRequest hooks
      requestConfig = await this.runRequestHooks(finalConfig, context);

      // Check if plugin returned mocked/cached data
      if ((requestConfig as any).__mocked || (requestConfig as any).__cached) {
        const mockData = (requestConfig as any).__mockData || (requestConfig as any).__cachedData;
        return mockData;
      }

      // Check if plugin deduped the request
      if ((requestConfig as any).__deduped) {
        return await (requestConfig as any).__promise;
      }

      // Build URL
      const url = buildURL(requestConfig);

      // Prepare headers
      const headers = { ...requestConfig.headers };

      // Prepare body
      const body = prepareBody(requestConfig.body, headers);

      // Create fetch options
      const fetchOptions: RequestInit = {
        method: requestConfig.method || 'GET',
        headers,
        body,
        signal: requestConfig.signal,
        credentials: requestConfig.credentials,
        cache: requestConfig.cache,
        redirect: requestConfig.redirect,
        referrerPolicy: requestConfig.referrerPolicy
      };

      // Make the request
      let response: Response;
      try {
        response = await fetch(url, fetchOptions);
      } catch (error: any) {
        // Handle network errors
        if (error && error.name === 'AbortError') {
          throw new AbortError('Request was aborted', requestConfig);
        }
        throw new NetworkError(
          error?.message || 'Network request failed',
          requestConfig
        );
      }

      // Parse response
      let data: any;
      try {
        data = await parseResponse(response, requestConfig.responseType);
      } catch (error: any) {
        throw new ParseError(
          'Failed to parse response: ' + error.message,
          undefined,
          requestConfig
        );
      }

      // Create response object
      const httpResponse: HttpResponse<T> = {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        config: requestConfig,
        response
      };

      // Check for HTTP errors (4xx, 5xx)
      if (!response.ok) {
        throw createHttpError(response, data, requestConfig);
      }

      // Run onResponse hooks
      const finalResponse = await this.runResponseHooks(httpResponse, requestConfig, context);

      return finalResponse;
    } catch (error: any) {
      // Run onError hooks
      const result = await this.runErrorHooks(error, requestConfig, context);

      // If result is an Error instance, throw it
      if (result instanceof Error) {
        throw result;
      }

      // If error hook returned a response (e.g., from retry or fallback), return it
      // Check if it's a valid response object (has data, status, headers, config)
      if (
        result &&
        typeof result === 'object' &&
        'data' in result &&
        'status' in result &&
        'headers' in result &&
        'config' in result &&
        !('code' in result) // Errors have a 'code' property, responses don't
      ) {
        return result;
      }

      // Otherwise, throw the result/error
      throw result;
    }
  }

  /**
   * Run all onRequest hooks
   */
  private async runRequestHooks(
    config: RequestConfig,
    context: PluginContext
  ): Promise<RequestConfig> {
    let currentConfig = deepClone(config);

    for (const plugin of this.plugins) {
      if (plugin.onRequest) {
        try {
          currentConfig = await plugin.onRequest(currentConfig, context);
        } catch (error) {
          console.error(`Error in ${plugin.name}.onRequest:`, error);
          throw error;
        }
      }
    }

    return currentConfig;
  }

  /**
   * Run all onResponse hooks
   */
  private async runResponseHooks(
    response: HttpResponse,
    config: RequestConfig,
    context: PluginContext
  ): Promise<HttpResponse> {
    let currentResponse = response;

    for (const plugin of this.plugins) {
      if (plugin.onResponse) {
        try {
          currentResponse = await plugin.onResponse(currentResponse, config, context);
        } catch (error) {
          console.error(`Error in ${plugin.name}.onResponse:`, error);
          throw error;
        }
      }
    }

    return currentResponse;
  }

  /**
   * Run all onError hooks
   */
  private async runErrorHooks(
    error: HttpError,
    config: RequestConfig,
    context: PluginContext
  ): Promise<any> {
    let currentError = error;

    for (const plugin of this.plugins) {
      if (plugin.onError) {
        try {
          const result = await plugin.onError(currentError, config, context);

          // Check if plugin wants to retry
          if (result && result.retry) {
            // Pass the context through to preserve retry state
            return this.request({ ...config, _retryContext: context } as any);
          }

          // Check if plugin returned a valid response (e.g., from offline queue)
          // Must have all required HttpResponse properties
          if (
            result &&
            typeof result === 'object' &&
            'data' in result &&
            'status' in result &&
            'headers' in result &&
            'config' in result &&
            !('code' in result) // Errors have a 'code' property, responses don't
          ) {
            return result;
          }
        } catch (pluginError: any) {
          // Plugin error - don't log to avoid interfering with plugin logging
          currentError = pluginError;
        }
      }
    }

    // If no plugin handled the error, return it to be thrown
    return currentError;
  }

  /**
   * Convenience methods
   */

  async get<T = any>(url: string, config?: RequestConfig): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, url, method: 'GET' });
  }

  async post<T = any>(url: string, data?: any, config?: RequestConfig): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, url, method: 'POST', body: data });
  }

  async put<T = any>(url: string, data?: any, config?: RequestConfig): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, url, method: 'PUT', body: data });
  }

  async delete<T = any>(url: string, config?: RequestConfig): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, url, method: 'DELETE' });
  }

  async patch<T = any>(url: string, data?: any, config?: RequestConfig): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, url, method: 'PATCH', body: data });
  }

  async head<T = any>(url: string, config?: RequestConfig): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, url, method: 'HEAD' });
  }

  async options<T = any>(url: string, config?: RequestConfig): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, url, method: 'OPTIONS' });
  }
}

/**
 * Create a default client instance
 */
export function createClient(config?: HttpClientConfig): IHttpClient {
  return new HttpClient(config);
}

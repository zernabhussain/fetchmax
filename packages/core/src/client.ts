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
 * Internal request config with plugin-specific properties
 * These properties are used internally by plugins and are not part of the public API
 */
interface InternalRequestConfig extends RequestConfig {
  _retryContext?: PluginContext;
  __mocked?: boolean;
  __cached?: boolean;
  __deduped?: boolean;
  __mockData?: HttpResponse;
  __cachedData?: HttpResponse;
  __promise?: Promise<HttpResponse>;
}

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
      const pluginValue: unknown = plugin[key];
      if (!hookNames.includes(key) && typeof pluginValue === 'function') {
        const pluginMethod = pluginValue as (...args: unknown[]) => unknown;
        // Cast this to Record to allow dynamic method assignment
        const client = this as unknown as Record<string, unknown>;

        // Inject 'this' reference to allow plugins to call client methods
        if (pluginMethod.length > 0) {
          client[key] = (...args: unknown[]) => pluginMethod.call(plugin, this, ...args);
        } else {
          client[key] = pluginMethod.bind(plugin);
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
    const finalConfig = mergeConfig(this.config, config) as InternalRequestConfig;

    // Create plugin context (or reuse existing one for retries)
    const context: PluginContext = finalConfig._retryContext || {};

    // Clean up the temporary _retryContext property
    if (finalConfig._retryContext) {
      delete finalConfig._retryContext;
    }

    // Initialize requestConfig so it's in scope for catch block
    let requestConfig: InternalRequestConfig = finalConfig;

    try {
      // Run onRequest hooks
      requestConfig = await this.runRequestHooks(finalConfig, context) as InternalRequestConfig;

      // Check if plugin returned mocked/cached data
      if (requestConfig.__mocked || requestConfig.__cached) {
        const mockData = requestConfig.__mockData || requestConfig.__cachedData;
        return mockData as HttpResponse<T>;
      }

      // Check if plugin deduped the request
      if (requestConfig.__deduped && requestConfig.__promise) {
        return await requestConfig.__promise as HttpResponse<T>;
      }

      // Build URL
      const url = buildURL(requestConfig);

      // Prepare headers
      const headers = { ...requestConfig.headers };

      // Prepare body
      const body: BodyInit | null | undefined = prepareBody(requestConfig.body, headers);

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
      } catch (error: unknown) {
        // Handle network errors
        if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') {
          throw new AbortError('Request was aborted', requestConfig);
        }
        const errorMessage = error && typeof error === 'object' && 'message' in error
          ? String(error.message)
          : 'Network request failed';
        throw new NetworkError(errorMessage, requestConfig);
      }

      // Parse response
      let data: T;
      try {
        data = await parseResponse(response, requestConfig.responseType) as T;
      } catch (error: unknown) {
        const errorMessage = error && typeof error === 'object' && 'message' in error
          ? String(error.message)
          : 'Unknown parse error';
        throw new ParseError(
          'Failed to parse response: ' + errorMessage,
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
    } catch (error: unknown) {
      // Run onError hooks
      const httpError = error instanceof Error ? error as HttpError : new Error(String(error)) as HttpError;
      const result = await this.runErrorHooks(httpError, requestConfig, context);

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
  ): Promise<HttpError | HttpResponse> {
    let currentError = error;

    for (const plugin of this.plugins) {
      if (plugin.onError) {
        try {
          const result: unknown = await plugin.onError(currentError, config, context);

          // Check if plugin wants to retry
          if (result && typeof result === 'object' && 'retry' in result) {
            const retryResult = result as { retry?: boolean };
            if (retryResult.retry) {
              // Pass the context through to preserve retry state
              const retryConfig: InternalRequestConfig = { ...config, _retryContext: context };
              return this.request(retryConfig);
            }
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
            return result as HttpResponse;
          }
        } catch (pluginError: unknown) {
          // Plugin error - don't log to avoid interfering with plugin logging
          currentError = pluginError instanceof Error ? pluginError as HttpError : new Error(String(pluginError)) as HttpError;
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
    return this.request<T>({ ...(config || {}), url, method: 'GET' });
  }

  async post<T = any>(url: string, data?: unknown, config?: RequestConfig): Promise<HttpResponse<T>> {
    return this.request<T>({ ...(config || {}), url, method: 'POST', body: data });
  }

  async put<T = any>(url: string, data?: unknown, config?: RequestConfig): Promise<HttpResponse<T>> {
    return this.request<T>({ ...(config || {}), url, method: 'PUT', body: data });
  }

  async delete<T = any>(url: string, config?: RequestConfig): Promise<HttpResponse<T>> {
    return this.request<T>({ ...(config || {}), url, method: 'DELETE' });
  }

  async patch<T = any>(url: string, data?: unknown, config?: RequestConfig): Promise<HttpResponse<T>> {
    return this.request<T>({ ...(config || {}), url, method: 'PATCH', body: data });
  }

  async head<T = any>(url: string, config?: RequestConfig): Promise<HttpResponse<T>> {
    return this.request<T>({ ...(config || {}), url, method: 'HEAD' });
  }

  async options<T = any>(url: string, config?: RequestConfig): Promise<HttpResponse<T>> {
    return this.request<T>({ ...(config || {}), url, method: 'OPTIONS' });
  }
}

/**
 * Create a default client instance
 */
export function createClient(config?: HttpClientConfig): IHttpClient {
  return new HttpClient(config);
}

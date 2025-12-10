/**
 * HTTP Methods supported by FetchMax
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

/**
 * Request configuration
 */
export interface RequestConfig {
  /** Base URL to prepend to all requests */
  baseURL?: string;
  /** Request URL */
  url?: string;
  /** HTTP method */
  method?: HttpMethod;
  /** Request headers */
  headers?: Record<string, string>;
  /** URL parameters */
  params?: Record<string, any>;
  /** Request body */
  body?: any;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** AbortController signal for cancellation */
  signal?: AbortSignal;
  /** Response type */
  responseType?: 'json' | 'text' | 'blob' | 'arrayBuffer' | 'stream';
  /** Credentials mode */
  credentials?: RequestCredentials;
  /** Cache mode */
  cache?: RequestCache;
  /** Redirect mode */
  redirect?: RequestRedirect;
  /** Referrer policy */
  referrerPolicy?: ReferrerPolicy;
  /** Additional fetch options */
  [key: string]: any;
}

/**
 * Response object
 */
export interface HttpResponse<T = any> {
  /** Response data */
  data: T;
  /** HTTP status code */
  status: number;
  /** HTTP status text */
  statusText: string;
  /** Response headers */
  headers: Headers;
  /** Request configuration */
  config: RequestConfig;
  /** Original Response object */
  response: Response;
}

/**
 * Error response
 */
export interface HttpError extends Error {
  /** Error name */
  name: string;
  /** Error message */
  message: string;
  /** HTTP status code (if available) */
  status?: number;
  /** HTTP status text (if available) */
  statusText?: string;
  /** Response data (if available) */
  data?: any;
  /** Request configuration */
  config?: RequestConfig;
  /** Original Response object (if available) */
  response?: Response;
  /** Error code */
  code?: string;
  /** Convert error to JSON (avoiding circular references) */
  toJSON(): any;
}

/**
 * Plugin interface
 */
export interface Plugin {
  /** Plugin name (must be unique) */
  name: string;

  /** Called before request is sent */
  onRequest?: (config: RequestConfig, context: PluginContext) => RequestConfig | Promise<RequestConfig>;

  /** Called after successful response */
  onResponse?: (response: HttpResponse, config: RequestConfig, context: PluginContext) => HttpResponse | Promise<HttpResponse>;

  /** Called when an error occurs */
  onError?: (error: HttpError, config: RequestConfig, context: PluginContext) => any;

  /** Any additional plugin methods or properties */
  [key: string]: any;
}

/**
 * Plugin context - shared state across plugin hooks
 */
export interface PluginContext {
  /** Retry count (if using retry plugin) */
  retryCount?: number;
  /** Custom context data */
  [key: string]: any;
}

/**
 * HttpClient configuration
 */
export interface HttpClientConfig extends RequestConfig {
  /** Array of plugins to use */
  plugins?: Plugin[];
}

/**
 * HTTP Client interface
 */
export interface IHttpClient {
  /** Make a generic HTTP request */
  request<T = any>(config: RequestConfig): Promise<HttpResponse<T>>;

  /** Make a GET request */
  get<T = any>(url: string, config?: RequestConfig): Promise<HttpResponse<T>>;

  /** Make a POST request */
  post<T = any>(url: string, data?: any, config?: RequestConfig): Promise<HttpResponse<T>>;

  /** Make a PUT request */
  put<T = any>(url: string, data?: any, config?: RequestConfig): Promise<HttpResponse<T>>;

  /** Make a DELETE request */
  delete<T = any>(url: string, config?: RequestConfig): Promise<HttpResponse<T>>;

  /** Make a PATCH request */
  patch<T = any>(url: string, data?: any, config?: RequestConfig): Promise<HttpResponse<T>>;

  /** Make a HEAD request */
  head<T = any>(url: string, config?: RequestConfig): Promise<HttpResponse<T>>;

  /** Make an OPTIONS request */
  options<T = any>(url: string, config?: RequestConfig): Promise<HttpResponse<T>>;

  /** Add a plugin */
  use(plugin: Plugin): IHttpClient;

  /** Create a new client instance with custom config */
  create(config?: HttpClientConfig): IHttpClient;
}

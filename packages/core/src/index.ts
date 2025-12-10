/**
 * FetchMax - The Ultimate Universal HTTP Client
 *
 * Maximum features, minimal bundle. The last HTTP client you'll ever need.
 *
 * @packageDocumentation
 */

// Export main client
export { HttpClient, createClient } from './client';

// Export types
export type {
  HttpMethod,
  RequestConfig,
  HttpResponse,
  HttpError as IHttpError,  // Export interface with different name to avoid conflict
  Plugin,
  PluginContext,
  HttpClientConfig,
  IHttpClient
} from './types';

// Export errors
export {
  HttpError,
  HttpError as HttpErrorClass,  // Keep for backwards compatibility
  NetworkError,
  TimeoutError,
  AbortError,
  RequestError,
  ServerError,
  ParseError,
  createHttpError
} from './errors';

// Export utilities
export {
  buildURL,
  mergeConfig,
  isPlainObject,
  prepareBody,
  parseResponse,
  deepClone,
  isBrowser,
  isNode,
  delay
} from './utils';

// Create default instance
import { HttpClient } from './client';
export const http = new HttpClient();

// Export default
export default http;

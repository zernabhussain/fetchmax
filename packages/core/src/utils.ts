import type { RequestConfig } from './types';

/**
 * Builds a full URL from baseURL and url with query parameters
 */
export function buildURL(config: RequestConfig): string {
  let url = config.url || '';

  // Prepend baseURL if present and url is not absolute
  if (config.baseURL && !url.match(/^https?:\/\//)) {
    // Remove trailing slash from baseURL
    const baseURL = config.baseURL.replace(/\/+$/, '');
    // Remove leading slash from url
    url = url.replace(/^\/+/, '');
    url = `${baseURL}/${url}`;
  }

  // Add query parameters
  if (config.params && Object.keys(config.params).length > 0) {
    const searchParams = new URLSearchParams();

    Object.entries(config.params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach(v => searchParams.append(key, String(v)));
        } else {
          searchParams.append(key, String(value));
        }
      }
    });

    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}${searchParams.toString()}`;
  }

  return url;
}

/**
 * Merges multiple configurations with precedence
 */
export function mergeConfig(...configs: (RequestConfig | undefined)[]): RequestConfig {
  const result: RequestConfig = {};

  configs.forEach(config => {
    if (!config) return;

    Object.entries(config).forEach(([key, value]) => {
      if (key === 'headers') {
        // Merge headers
        result.headers = {
          ...result.headers,
          ...value
        };
      } else if (value !== undefined) {
        (result as any)[key] = value;
      }
    });
  });

  return result;
}

/**
 * Determines if a value is a plain object
 */
export function isPlainObject(value: any): boolean {
  if (typeof value !== 'object' || value === null) return false;

  const prototype = Object.getPrototypeOf(value);
  return prototype === null || prototype === Object.prototype;
}

/**
 * Prepares request body based on content type
 */
export function prepareBody(body: any, headers: Record<string, string> = {}): any {
  if (!body) return undefined;

  // If body is already a string, FormData, Blob, etc., return as-is
  if (
    typeof body === 'string' ||
    body instanceof FormData ||
    body instanceof Blob ||
    body instanceof ArrayBuffer ||
    body instanceof URLSearchParams
  ) {
    return body;
  }

  // Auto-set Content-Type for JSON
  const contentType = Object.keys(headers).find(
    key => key.toLowerCase() === 'content-type'
  );

  if (!contentType && isPlainObject(body)) {
    headers['Content-Type'] = 'application/json';
    return JSON.stringify(body);
  }

  return body;
}

/**
 * Parses response based on content type
 */
export async function parseResponse(response: Response, responseType?: string): Promise<any> {
  // Check for empty response (common with HEAD, DELETE, OPTIONS requests)
  const contentLength = response.headers.get('content-length');
  if (contentLength === '0') {
    return null;
  }

  // If responseType is specified, use it
  if (responseType) {
    switch (responseType) {
      case 'json':
        return response.json().catch(() => null);
      case 'text':
        return response.text();
      case 'blob':
        return response.blob();
      case 'arrayBuffer':
        return response.arrayBuffer();
      case 'stream':
        return response.body;
      default:
        return response.json().catch(() => null);
    }
  }

  // Auto-detect based on Content-Type header
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const text = await response.text();
    // Handle empty response
    if (!text || text.trim() === '') return null;
    try {
      return JSON.parse(text);
    } catch (e) {
      return text;
    }
  }

  if (
    contentType.includes('text/') ||
    contentType.includes('application/xml') ||
    contentType.includes('application/xhtml')
  ) {
    return response.text();
  }

  if (contentType.includes('multipart/') || contentType.includes('image/')) {
    return response.blob();
  }

  // Default: try to read as text first to check if empty
  const text = await response.text();
  if (!text || text.trim() === '') {
    return null;
  }

  // Try to parse as JSON if not empty
  try {
    return JSON.parse(text);
  } catch (e) {
    // If JSON parsing fails, return the text
    return text;
  }
}

/**
 * Deep clones an object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as any;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as any;
  if (obj instanceof Set) return new Set(Array.from(obj).map(item => deepClone(item))) as any;
  if (obj instanceof Map) {
    return new Map(
      Array.from(obj.entries()).map(([key, value]) => [key, deepClone(value)])
    ) as any;
  }

  if (typeof obj === 'object') {
    const clonedObj: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone((obj as any)[key]);
      }
    }
    return clonedObj;
  }

  return obj;
}

/**
 * Checks if code is running in browser environment
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/**
 * Checks if code is running in Node.js environment
 */
export function isNode(): boolean {
  return typeof process !== 'undefined' && process.versions?.node != null;
}

/**
 * Delays execution for specified milliseconds
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

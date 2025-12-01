import type { RequestConfig, HttpError as IHttpError } from './types';

/**
 * Base HTTP Error class
 */
export class HttpError extends Error implements IHttpError {
  public status?: number;
  public statusText?: string;
  public data?: any;
  public config?: RequestConfig;
  public response?: Response;
  public code?: string;

  constructor(
    message: string,
    status?: number,
    statusText?: string,
    data?: any,
    config?: RequestConfig,
    response?: Response
  ) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.statusText = statusText;
    this.data = data;
    this.config = config;
    this.response = response;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, HttpError);
    }
  }
}

/**
 * Network Error - thrown when network request fails
 */
export class NetworkError extends HttpError {
  constructor(message: string, config?: RequestConfig) {
    super(message, undefined, undefined, undefined, config);
    this.name = 'NetworkError';
    this.code = 'NETWORK_ERROR';
  }
}

/**
 * Timeout Error - thrown when request times out
 */
export class TimeoutError extends HttpError {
  constructor(message: string, config?: RequestConfig) {
    super(message, undefined, undefined, undefined, config);
    this.name = 'TimeoutError';
    this.code = 'TIMEOUT_ERROR';
  }
}

/**
 * Abort Error - thrown when request is aborted
 */
export class AbortError extends HttpError {
  constructor(message: string, config?: RequestConfig) {
    super(message, undefined, undefined, undefined, config);
    this.name = 'AbortError';
    this.code = 'ABORT_ERROR';
  }
}

/**
 * Request Error - 4xx errors (client errors)
 */
export class RequestError extends HttpError {
  constructor(
    message: string,
    status: number,
    statusText: string,
    data?: any,
    config?: RequestConfig,
    response?: Response
  ) {
    super(message, status, statusText, data, config, response);
    this.name = 'RequestError';
    this.code = 'REQUEST_ERROR';
  }
}

/**
 * Server Error - 5xx errors (server errors)
 */
export class ServerError extends HttpError {
  constructor(
    message: string,
    status: number,
    statusText: string,
    data?: any,
    config?: RequestConfig,
    response?: Response
  ) {
    super(message, status, statusText, data, config, response);
    this.name = 'ServerError';
    this.code = 'SERVER_ERROR';
  }
}

/**
 * Parse Error - thrown when response parsing fails
 */
export class ParseError extends HttpError {
  constructor(message: string, data?: any, config?: RequestConfig) {
    super(message, undefined, undefined, data, config);
    this.name = 'ParseError';
    this.code = 'PARSE_ERROR';
  }
}

/**
 * Creates appropriate error based on response status
 */
export function createHttpError(
  response: Response,
  data: any,
  config: RequestConfig
): HttpError {
  const status = response.status;
  const statusText = response.statusText;
  const message = `Request failed with status ${status}: ${statusText}`;

  if (status >= 400 && status < 500) {
    return new RequestError(message, status, statusText, data, config, response);
  } else if (status >= 500) {
    return new ServerError(message, status, statusText, data, config, response);
  }

  return new HttpError(message, status, statusText, data, config, response);
}

import { describe, it, expect } from 'vitest';
import type { RequestConfig } from '@fetchmax/core';
import {
  HttpError,
  NetworkError,
  TimeoutError,
  AbortError,
  RequestError,
  ServerError,
  ParseError,
  createHttpError
} from '@fetchmax/core';

describe('Errors', () => {
  const mockConfig: RequestConfig = {
    url: 'https://api.example.com/test',
    method: 'GET'
  };

  describe('HttpError', () => {
    it('should create basic HttpError', () => {
      const error = new HttpError('Test error');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(HttpError);
      expect(error.name).toBe('HttpError');
      expect(error.message).toBe('Test error');
    });

    it('should store status and statusText', () => {
      const error = new HttpError('Test error', 404, 'Not Found');

      expect(error.status).toBe(404);
      expect(error.statusText).toBe('Not Found');
    });

    it('should store data and config', () => {
      const data = { error: 'Not found' };
      const error = new HttpError('Test error', 404, 'Not Found', data, mockConfig);

      expect(error.data).toEqual(data);
      expect(error.config).toEqual(mockConfig);
    });

    it('should store response object', () => {
      const response = new Response(null, { status: 404 });
      const error = new HttpError('Test error', 404, 'Not Found', null, mockConfig, response);

      expect(error.response).toBe(response);
    });

    it('should have proper stack trace', () => {
      const error = new HttpError('Test error');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('HttpError');
    });
  });

  describe('NetworkError', () => {
    it('should create NetworkError', () => {
      const error = new NetworkError('Network failed', mockConfig);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(HttpError);
      expect(error).toBeInstanceOf(NetworkError);
      expect(error.name).toBe('NetworkError');
      expect(error.message).toBe('Network failed');
      expect(error.code).toBe('NETWORK_ERROR');
    });

    it('should store config', () => {
      const error = new NetworkError('Network failed', mockConfig);

      expect(error.config).toEqual(mockConfig);
    });

    it('should have undefined status', () => {
      const error = new NetworkError('Network failed');

      expect(error.status).toBeUndefined();
      expect(error.statusText).toBeUndefined();
    });
  });

  describe('TimeoutError', () => {
    it('should create TimeoutError', () => {
      const error = new TimeoutError('Request timeout', mockConfig);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(HttpError);
      expect(error).toBeInstanceOf(TimeoutError);
      expect(error.name).toBe('TimeoutError');
      expect(error.message).toBe('Request timeout');
      expect(error.code).toBe('TIMEOUT_ERROR');
    });

    it('should store config', () => {
      const error = new TimeoutError('Request timeout', mockConfig);

      expect(error.config).toEqual(mockConfig);
    });

    it('should have undefined status', () => {
      const error = new TimeoutError('Request timeout');

      expect(error.status).toBeUndefined();
      expect(error.statusText).toBeUndefined();
    });
  });

  describe('AbortError', () => {
    it('should create AbortError', () => {
      const error = new AbortError('Request aborted', mockConfig);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(HttpError);
      expect(error).toBeInstanceOf(AbortError);
      expect(error.name).toBe('AbortError');
      expect(error.message).toBe('Request aborted');
      expect(error.code).toBe('ABORT_ERROR');
    });

    it('should store config', () => {
      const error = new AbortError('Request aborted', mockConfig);

      expect(error.config).toEqual(mockConfig);
    });

    it('should have undefined status', () => {
      const error = new AbortError('Request aborted');

      expect(error.status).toBeUndefined();
      expect(error.statusText).toBeUndefined();
    });
  });

  describe('RequestError', () => {
    it('should create RequestError for 4xx errors', () => {
      const data = { error: 'Not found' };
      const response = new Response(null, { status: 404 });
      const error = new RequestError(
        'Request failed',
        404,
        'Not Found',
        data,
        mockConfig,
        response
      );

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(HttpError);
      expect(error).toBeInstanceOf(RequestError);
      expect(error.name).toBe('RequestError');
      expect(error.message).toBe('Request failed');
      expect(error.code).toBe('REQUEST_ERROR');
      expect(error.status).toBe(404);
      expect(error.statusText).toBe('Not Found');
      expect(error.data).toEqual(data);
      expect(error.config).toEqual(mockConfig);
      expect(error.response).toBe(response);
    });

    it('should handle different 4xx status codes', () => {
      const error400 = new RequestError('Bad Request', 400, 'Bad Request');
      expect(error400.status).toBe(400);

      const error401 = new RequestError('Unauthorized', 401, 'Unauthorized');
      expect(error401.status).toBe(401);

      const error403 = new RequestError('Forbidden', 403, 'Forbidden');
      expect(error403.status).toBe(403);

      const error404 = new RequestError('Not Found', 404, 'Not Found');
      expect(error404.status).toBe(404);

      const error422 = new RequestError('Unprocessable Entity', 422, 'Unprocessable Entity');
      expect(error422.status).toBe(422);

      const error429 = new RequestError('Too Many Requests', 429, 'Too Many Requests');
      expect(error429.status).toBe(429);
    });
  });

  describe('ServerError', () => {
    it('should create ServerError for 5xx errors', () => {
      const data = { error: 'Internal server error' };
      const response = new Response(null, { status: 500 });
      const error = new ServerError(
        'Server error',
        500,
        'Internal Server Error',
        data,
        mockConfig,
        response
      );

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(HttpError);
      expect(error).toBeInstanceOf(ServerError);
      expect(error.name).toBe('ServerError');
      expect(error.message).toBe('Server error');
      expect(error.code).toBe('SERVER_ERROR');
      expect(error.status).toBe(500);
      expect(error.statusText).toBe('Internal Server Error');
      expect(error.data).toEqual(data);
      expect(error.config).toEqual(mockConfig);
      expect(error.response).toBe(response);
    });

    it('should handle different 5xx status codes', () => {
      const error500 = new ServerError('Internal Server Error', 500, 'Internal Server Error');
      expect(error500.status).toBe(500);

      const error502 = new ServerError('Bad Gateway', 502, 'Bad Gateway');
      expect(error502.status).toBe(502);

      const error503 = new ServerError('Service Unavailable', 503, 'Service Unavailable');
      expect(error503.status).toBe(503);

      const error504 = new ServerError('Gateway Timeout', 504, 'Gateway Timeout');
      expect(error504.status).toBe(504);
    });
  });

  describe('ParseError', () => {
    it('should create ParseError', () => {
      const data = 'invalid json';
      const error = new ParseError('Failed to parse response', data, mockConfig);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(HttpError);
      expect(error).toBeInstanceOf(ParseError);
      expect(error.name).toBe('ParseError');
      expect(error.message).toBe('Failed to parse response');
      expect(error.code).toBe('PARSE_ERROR');
      expect(error.data).toBe(data);
      expect(error.config).toEqual(mockConfig);
    });

    it('should have undefined status', () => {
      const error = new ParseError('Parse failed');

      expect(error.status).toBeUndefined();
      expect(error.statusText).toBeUndefined();
    });
  });

  describe('createHttpError', () => {
    it('should create RequestError for 4xx status', () => {
      const response = new Response(null, { status: 404, statusText: 'Not Found' });
      const data = { error: 'Not found' };
      const error = createHttpError(response, data, mockConfig);

      expect(error).toBeInstanceOf(RequestError);
      expect(error.status).toBe(404);
      expect(error.statusText).toBe('Not Found');
      expect(error.data).toEqual(data);
      expect(error.config).toEqual(mockConfig);
      expect(error.response).toBe(response);
    });

    it('should create ServerError for 5xx status', () => {
      const response = new Response(null, { status: 500, statusText: 'Internal Server Error' });
      const data = { error: 'Server error' };
      const error = createHttpError(response, data, mockConfig);

      expect(error).toBeInstanceOf(ServerError);
      expect(error.status).toBe(500);
      expect(error.statusText).toBe('Internal Server Error');
      expect(error.data).toEqual(data);
      expect(error.config).toEqual(mockConfig);
      expect(error.response).toBe(response);
    });

    it('should create generic HttpError for other status codes', () => {
      const response = new Response(null, { status: 304, statusText: 'Not Modified' });
      const data = null;
      const error = createHttpError(response, data, mockConfig);

      expect(error).toBeInstanceOf(HttpError);
      expect(error).not.toBeInstanceOf(RequestError);
      expect(error).not.toBeInstanceOf(ServerError);
      expect(error.status).toBe(304);
      expect(error.statusText).toBe('Not Modified');
    });

    it('should include error message with status', () => {
      const response = new Response(null, { status: 404, statusText: 'Not Found' });
      const error = createHttpError(response, null, mockConfig);

      expect(error.message).toBe('Request failed with status 404: Not Found');
    });

    it('should handle all 4xx status codes', () => {
      const statuses = [400, 401, 403, 404, 405, 406, 408, 409, 410, 422, 429, 451, 499];

      statuses.forEach(status => {
        const response = new Response(null, { status });
        const error = createHttpError(response, null, mockConfig);

        expect(error).toBeInstanceOf(RequestError);
        expect(error.status).toBe(status);
      });
    });

    it('should handle all common 5xx status codes', () => {
      const statuses = [500, 501, 502, 503, 504, 505, 507, 508, 509, 510, 511, 599];

      statuses.forEach(status => {
        const response = new Response(null, { status });
        const error = createHttpError(response, null, mockConfig);

        expect(error).toBeInstanceOf(ServerError);
        expect(error.status).toBe(status);
      });
    });

    it('should preserve response object', () => {
      const response = new Response(JSON.stringify({ error: 'test' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
      const error = createHttpError(response, { error: 'test' }, mockConfig);

      expect(error.response).toBe(response);
      expect(error.response?.status).toBe(500);
    });
  });

  describe('Error inheritance', () => {
    it('should maintain proper inheritance chain', () => {
      const networkError = new NetworkError('test');
      const timeoutError = new TimeoutError('test');
      const abortError = new AbortError('test');
      const requestError = new RequestError('test', 404, 'Not Found');
      const serverError = new ServerError('test', 500, 'Internal Server Error');
      const parseError = new ParseError('test');

      // All should be instances of HttpError
      expect(networkError).toBeInstanceOf(HttpError);
      expect(timeoutError).toBeInstanceOf(HttpError);
      expect(abortError).toBeInstanceOf(HttpError);
      expect(requestError).toBeInstanceOf(HttpError);
      expect(serverError).toBeInstanceOf(HttpError);
      expect(parseError).toBeInstanceOf(HttpError);

      // All should be instances of Error
      expect(networkError).toBeInstanceOf(Error);
      expect(timeoutError).toBeInstanceOf(Error);
      expect(abortError).toBeInstanceOf(Error);
      expect(requestError).toBeInstanceOf(Error);
      expect(serverError).toBeInstanceOf(Error);
      expect(parseError).toBeInstanceOf(Error);
    });

    it('should be catchable as Error', () => {
      const error = new RequestError('test', 404, 'Not Found');

      try {
        throw error;
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
        expect(e).toBeInstanceOf(HttpError);
        expect(e).toBeInstanceOf(RequestError);
      }
    });

    it('should be distinguishable by instanceof', () => {
      const requestError = new RequestError('test', 404, 'Not Found');
      const serverError = new ServerError('test', 500, 'Internal Server Error');

      expect(requestError).toBeInstanceOf(RequestError);
      expect(requestError).not.toBeInstanceOf(ServerError);

      expect(serverError).toBeInstanceOf(ServerError);
      expect(serverError).not.toBeInstanceOf(RequestError);
    });
  });
});

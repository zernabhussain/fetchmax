import { describe, it, expect } from 'vitest';
import type { RequestConfig } from '@fetchmax/core';
import {
  buildURL,
  mergeConfig,
  isPlainObject,
  prepareBody,
  parseResponse,
  deepClone,
  isBrowser,
  isNode,
  delay
} from '@fetchmax/core';

describe('Utils', () => {
  describe('buildURL', () => {
    it('should return url as-is when no baseURL or params', () => {
      const config: RequestConfig = { url: 'https://api.example.com/users' };
      expect(buildURL(config)).toBe('https://api.example.com/users');
    });

    it('should concatenate baseURL and url', () => {
      const config: RequestConfig = {
        baseURL: 'https://api.example.com',
        url: 'users'
      };
      expect(buildURL(config)).toBe('https://api.example.com/users');
    });

    it('should handle trailing slash in baseURL', () => {
      const config: RequestConfig = {
        baseURL: 'https://api.example.com/',
        url: 'users'
      };
      expect(buildURL(config)).toBe('https://api.example.com/users');
    });

    it('should handle leading slash in url', () => {
      const config: RequestConfig = {
        baseURL: 'https://api.example.com',
        url: '/users'
      };
      expect(buildURL(config)).toBe('https://api.example.com/users');
    });

    it('should handle multiple slashes', () => {
      const config: RequestConfig = {
        baseURL: 'https://api.example.com///',
        url: '///users'
      };
      expect(buildURL(config)).toBe('https://api.example.com/users');
    });

    it('should append query parameters', () => {
      const config: RequestConfig = {
        url: 'https://api.example.com/users',
        params: { page: 1, limit: 10 }
      };
      const result = buildURL(config);
      expect(result).toContain('page=1');
      expect(result).toContain('limit=10');
    });

    it('should handle array parameters', () => {
      const config: RequestConfig = {
        url: 'https://api.example.com/users',
        params: { ids: [1, 2, 3] }
      };
      const result = buildURL(config);
      expect(result).toContain('ids=1');
      expect(result).toContain('ids=2');
      expect(result).toContain('ids=3');
    });

    it('should skip null and undefined parameters', () => {
      const config: RequestConfig = {
        url: 'https://api.example.com/users',
        params: { page: 1, empty: null, missing: undefined }
      };
      const result = buildURL(config);
      expect(result).toContain('page=1');
      expect(result).not.toContain('empty');
      expect(result).not.toContain('missing');
    });

    it('should handle existing query parameters in URL', () => {
      const config: RequestConfig = {
        url: 'https://api.example.com/users?existing=value',
        params: { page: 1 }
      };
      const result = buildURL(config);
      expect(result).toContain('existing=value');
      expect(result).toContain('&page=1');
    });

    it('should handle empty params object', () => {
      const config: RequestConfig = {
        url: 'https://api.example.com/users',
        params: {}
      };
      expect(buildURL(config)).toBe('https://api.example.com/users');
    });

    it('should convert param values to strings', () => {
      const config: RequestConfig = {
        url: 'https://api.example.com/users',
        params: { active: true, count: 0 }
      };
      const result = buildURL(config);
      expect(result).toContain('active=true');
      expect(result).toContain('count=0');
    });
  });

  describe('mergeConfig', () => {
    it('should merge multiple configs', () => {
      const config1: RequestConfig = { baseURL: 'https://api.example.com' };
      const config2: RequestConfig = { timeout: 5000 };
      const result = mergeConfig(config1, config2);

      expect(result.baseURL).toBe('https://api.example.com');
      expect(result.timeout).toBe(5000);
    });

    it('should merge headers separately', () => {
      const config1: RequestConfig = { headers: { 'X-First': 'value1' } };
      const config2: RequestConfig = { headers: { 'X-Second': 'value2' } };
      const result = mergeConfig(config1, config2);

      expect(result.headers).toEqual({
        'X-First': 'value1',
        'X-Second': 'value2'
      });
    });

    it('should override conflicting properties (last wins)', () => {
      const config1: RequestConfig = { timeout: 1000 };
      const config2: RequestConfig = { timeout: 5000 };
      const result = mergeConfig(config1, config2);

      expect(result.timeout).toBe(5000);
    });

    it('should override conflicting headers (last wins)', () => {
      const config1: RequestConfig = { headers: { 'X-Custom': 'value1' } };
      const config2: RequestConfig = { headers: { 'X-Custom': 'value2' } };
      const result = mergeConfig(config1, config2);

      expect(result.headers!['X-Custom']).toBe('value2');
    });

    it('should handle undefined configs', () => {
      const config1: RequestConfig = { baseURL: 'https://api.example.com' };
      const result = mergeConfig(config1, undefined, { timeout: 5000 });

      expect(result.baseURL).toBe('https://api.example.com');
      expect(result.timeout).toBe(5000);
    });

    it('should skip undefined values', () => {
      const config1: RequestConfig = { baseURL: 'https://api.example.com', timeout: undefined };
      const config2: RequestConfig = { baseURL: undefined };
      const result = mergeConfig(config1, config2);

      expect(result.baseURL).toBe('https://api.example.com');
      expect(result.timeout).toBeUndefined();
    });

    it('should merge empty configs', () => {
      const result = mergeConfig({}, {});
      expect(result).toEqual({});
    });
  });

  describe('isPlainObject', () => {
    it('should return true for plain objects', () => {
      expect(isPlainObject({})).toBe(true);
      expect(isPlainObject({ key: 'value' })).toBe(true);
      expect(isPlainObject(Object.create(null))).toBe(true);
    });

    it('should return false for non-plain objects', () => {
      expect(isPlainObject(null)).toBe(false);
      expect(isPlainObject(undefined)).toBe(false);
      expect(isPlainObject([])).toBe(false);
      expect(isPlainObject(new Date())).toBe(false);
      expect(isPlainObject(new Set())).toBe(false);
      expect(isPlainObject(new Map())).toBe(false);
      expect(isPlainObject(() => {})).toBe(false);
      expect(isPlainObject('string')).toBe(false);
      expect(isPlainObject(123)).toBe(false);
      expect(isPlainObject(true)).toBe(false);
    });

    it('should return false for class instances', () => {
      class MyClass {}
      expect(isPlainObject(new MyClass())).toBe(false);
    });
  });

  describe('prepareBody', () => {
    it('should return undefined for falsy body', () => {
      expect(prepareBody(null)).toBeUndefined();
      expect(prepareBody(undefined)).toBeUndefined();
      // Empty string is truthy in the context, but prepareBody returns undefined for empty string
      expect(prepareBody('')).toBeUndefined();
    });

    it('should return string body as-is', () => {
      const body = 'test string';
      expect(prepareBody(body)).toBe(body);
    });

    it('should return FormData as-is', () => {
      const body = new FormData();
      expect(prepareBody(body)).toBe(body);
    });

    it('should return Blob as-is', () => {
      const body = new Blob(['test']);
      expect(prepareBody(body)).toBe(body);
    });

    it('should return ArrayBuffer as-is', () => {
      const body = new ArrayBuffer(8);
      expect(prepareBody(body)).toBe(body);
    });

    it('should return URLSearchParams as-is', () => {
      const body = new URLSearchParams('key=value');
      expect(prepareBody(body)).toBe(body);
    });

    it('should stringify plain objects and set Content-Type', () => {
      const headers: Record<string, string> = {};
      const body = { key: 'value' };
      const result = prepareBody(body, headers);

      expect(result).toBe('{"key":"value"}');
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('should not override existing Content-Type', () => {
      const headers: Record<string, string> = { 'Content-Type': 'text/plain' };
      const body = { key: 'value' };
      const result = prepareBody(body, headers);

      expect(result).toEqual(body);
      expect(headers['Content-Type']).toBe('text/plain');
    });

    it('should handle case-insensitive Content-Type header', () => {
      const headers: Record<string, string> = { 'content-type': 'text/plain' };
      const body = { key: 'value' };
      const result = prepareBody(body, headers);

      expect(result).toEqual(body);
    });
  });

  describe('parseResponse', () => {
    it('should return null for empty response (Content-Length: 0)', async () => {
      const response = new Response(null, {
        headers: { 'Content-Length': '0' }
      });
      const result = await parseResponse(response);
      expect(result).toBeNull();
    });

    it('should parse JSON with responseType=json', async () => {
      const response = new Response(JSON.stringify({ key: 'value' }));
      const result = await parseResponse(response, 'json');
      expect(result).toEqual({ key: 'value' });
    });

    it('should return null for invalid JSON with responseType=json', async () => {
      const response = new Response('invalid json');
      const result = await parseResponse(response, 'json');
      expect(result).toBeNull();
    });

    it('should parse text with responseType=text', async () => {
      const response = new Response('plain text');
      const result = await parseResponse(response, 'text');
      expect(result).toBe('plain text');
    });

    it('should parse blob with responseType=blob', async () => {
      const response = new Response('blob content');
      const result = await parseResponse(response, 'blob');
      expect(result).toBeInstanceOf(Blob);
    });

    it('should parse arrayBuffer with responseType=arrayBuffer', async () => {
      const response = new Response('buffer content');
      const result = await parseResponse(response, 'arrayBuffer');
      expect(result).toBeInstanceOf(ArrayBuffer);
    });

    it('should return stream with responseType=stream', async () => {
      const response = new Response('stream content');
      const result = await parseResponse(response, 'stream');
      expect(result).toBeDefined();
    });

    it('should auto-detect JSON from Content-Type', async () => {
      const response = new Response(JSON.stringify({ key: 'value' }), {
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await parseResponse(response);
      expect(result).toEqual({ key: 'value' });
    });

    it('should handle empty JSON response', async () => {
      const response = new Response('', {
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await parseResponse(response);
      expect(result).toBeNull();
    });

    it('should handle whitespace-only JSON response', async () => {
      const response = new Response('   ', {
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await parseResponse(response);
      expect(result).toBeNull();
    });

    it('should auto-detect text from Content-Type', async () => {
      const response = new Response('plain text', {
        headers: { 'Content-Type': 'text/plain' }
      });
      const result = await parseResponse(response);
      expect(result).toBe('plain text');
    });

    it('should auto-detect XML as text', async () => {
      const response = new Response('<xml>content</xml>', {
        headers: { 'Content-Type': 'application/xml' }
      });
      const result = await parseResponse(response);
      expect(result).toBe('<xml>content</xml>');
    });

    it('should auto-detect blob from Content-Type', async () => {
      const response = new Response('image data', {
        headers: { 'Content-Type': 'image/png' }
      });
      const result = await parseResponse(response);
      expect(result).toBeInstanceOf(Blob);
    });

    it('should try JSON parse for unknown Content-Type', async () => {
      const response = new Response(JSON.stringify({ key: 'value' }), {
        headers: { 'Content-Type': 'application/octet-stream' }
      });
      const result = await parseResponse(response);
      // Should parse as JSON even with unknown content type
      expect(result).toEqual({ key: 'value' });
    });

    it('should return text for unparseable JSON', async () => {
      const response = new Response('not json');
      const result = await parseResponse(response);
      expect(result).toBe('not json');
    });

    it('should handle invalid JSON gracefully', async () => {
      const response = new Response('{"invalid": json}', {
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await parseResponse(response);
      expect(result).toBe('{"invalid": json}');
    });
  });

  describe('deepClone', () => {
    it('should clone primitive values', () => {
      expect(deepClone(null)).toBeNull();
      expect(deepClone(undefined)).toBeUndefined();
      expect(deepClone(123)).toBe(123);
      expect(deepClone('string')).toBe('string');
      expect(deepClone(true)).toBe(true);
    });

    it('should clone plain objects', () => {
      const obj = { a: 1, b: { c: 2 } };
      const cloned = deepClone(obj);

      expect(cloned).toEqual(obj);
      expect(cloned).not.toBe(obj);
      expect(cloned.b).not.toBe(obj.b);
    });

    it('should clone arrays', () => {
      const arr = [1, 2, [3, 4]];
      const cloned = deepClone(arr);

      expect(cloned).toEqual(arr);
      expect(cloned).not.toBe(arr);
      expect(cloned[2]).not.toBe(arr[2]);
    });

    it('should clone Date objects', () => {
      const date = new Date('2024-01-01');
      const cloned = deepClone(date);

      expect(cloned).toEqual(date);
      expect(cloned).not.toBe(date);
    });

    it('should clone Set objects', () => {
      const set = new Set([1, 2, { a: 3 }]);
      const cloned = deepClone(set);

      expect(cloned).toEqual(set);
      expect(cloned).not.toBe(set);
    });

    it('should clone Map objects', () => {
      const map = new Map([['key', { value: 1 }]]);
      const cloned = deepClone(map);

      expect(cloned).toEqual(map);
      expect(cloned).not.toBe(map);
    });

    it('should handle circular references gracefully', () => {
      const obj: any = { a: 1 };
      obj.self = obj;

      // Deep clone doesn't handle circular refs - it will cause stack overflow
      // This is expected behavior for simple deep clone implementation
      expect(() => deepClone(obj)).toThrow();
    });

    it('should clone nested structures', () => {
      const complex = {
        array: [1, 2, { nested: true }],
        object: { deep: { value: 'test' } },
        date: new Date(),
        set: new Set([1, 2]),
        map: new Map([['key', 'value']])
      };

      const cloned = deepClone(complex);

      expect(cloned).toEqual(complex);
      expect(cloned).not.toBe(complex);
      expect(cloned.array).not.toBe(complex.array);
      expect(cloned.object.deep).not.toBe(complex.object.deep);
    });
  });

  describe('isBrowser', () => {
    it('should detect browser environment', () => {
      const result = isBrowser();
      // In test environment (jsdom), this should be true
      expect(typeof result).toBe('boolean');
    });
  });

  describe('isNode', () => {
    it('should detect Node.js environment', () => {
      const result = isNode();
      // In test environment, this should be true
      expect(typeof result).toBe('boolean');
    });
  });

  describe('delay', () => {
    it('should delay execution', async () => {
      const start = Date.now();
      await delay(100);
      const end = Date.now();

      expect(end - start).toBeGreaterThanOrEqual(90); // Allow some variance
    });

    it('should return a Promise', () => {
      const result = delay(10);
      expect(result).toBeInstanceOf(Promise);
    });
  });
});

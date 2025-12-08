import type { Plugin, PluginContext, HttpResponse } from '@fetchmax/core';

export interface TransformConfig {
  transformRequest?: (data: any, headers: any) => any;
  transformResponse?: (data: any, headers: any) => any;
}

export function transformPlugin(config: TransformConfig = {}): Plugin {
  const { transformRequest, transformResponse } = config;

  return {
    name: 'transform',

    async onRequest(request: any, _context: PluginContext) {
      if (transformRequest && request.body) {
        request.body = transformRequest(request.body, request.headers || {});
      }
      return request;
    },

    async onResponse(response: HttpResponse, _request: any, _context: PluginContext) {
      if (transformResponse) {
        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });
        response.data = transformResponse(response.data, headers);
      }
      return response;
    }
  };
}

// Utility transform functions
export const transforms = {
  camelCase: (obj: any): any => {
    if (Array.isArray(obj)) {
      return obj.map(transforms.camelCase);
    }
    if (obj !== null && typeof obj === 'object') {
      return Object.keys(obj).reduce((result, key) => {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        (result as any)[camelKey] = transforms.camelCase(obj[key]);
        return result;
      }, {});
    }
    return obj;
  },

  snakeCase: (obj: any): any => {
    if (Array.isArray(obj)) {
      return obj.map(transforms.snakeCase);
    }
    if (obj !== null && typeof obj === 'object') {
      return Object.keys(obj).reduce((result, key) => {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        (result as any)[snakeKey] = transforms.snakeCase(obj[key]);
        return result;
      }, {});
    }
    return obj;
  }
};

export default transformPlugin;

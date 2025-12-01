import type { Plugin, PluginContext, HttpResponse } from '@fetchmax/core';

function getCacheKey(request: any): string {
  const method = request.method?.toUpperCase() || 'GET';
  const url = request.url || '';
  const params = request.params ? JSON.stringify(request.params) : '';
  return `${method}:${url}:${params}`;
}

export function dedupePlugin(): Plugin & { clear: () => void } {
  const pendingRequests = new Map<string, {
    promise: Promise<HttpResponse>;
    resolve: (value: HttpResponse) => void;
    reject: (error: any) => void;
    wasUsed: boolean;
  }>();

  const plugin: any = {
    name: 'dedupe',

    async onRequest(request: any, context: PluginContext) {
      const key = getCacheKey(request);

      if (pendingRequests.has(key)) {
        console.log(`[Dedupe] Request already in flight: ${request.url}`);
        const entry = pendingRequests.get(key)!;
        entry.wasUsed = true; // Mark as used by a deduped request
        return {
          ...request,
          __deduped: true,
          __promise: entry.promise
        };
      }

      // Create a new pending promise for this request
      let resolve: (value: HttpResponse) => void;
      let reject: (error: any) => void;
      const promise = new Promise<HttpResponse>((res, rej) => {
        resolve = res;
        reject = rej;
      });

      pendingRequests.set(key, {
        promise,
        resolve: resolve!,
        reject: reject!,
        wasUsed: false
      });

      return {
        ...request,
        __dedupeKey: key,
        __dedupeResolve: resolve!,
        __dedupeReject: reject!,
        __wasUsed: false
      };
    },

    async onResponse(response: HttpResponse, request: any, context: PluginContext) {
      if (request.__dedupeKey) {
        const pending = pendingRequests.get(request.__dedupeKey);
        if (pending) {
          // Store wasUsed on request before deleting from map
          request.__wasUsed = pending.wasUsed;
          // Only resolve if the promise was actually used by a deduped request
          if (pending.wasUsed) {
            pending.resolve(response);
          }
          pendingRequests.delete(request.__dedupeKey);
        } else if (request.__dedupeResolve) {
          // If map was cleared, use the resolve function from the request
          // (This only happens when .clear() was called while requests were in flight)
          request.__dedupeResolve(response);
        }
      }
      return response;
    },

    async onError(error: any, request: any, context: PluginContext) {
      if (request.__dedupeKey) {
        const pending = pendingRequests.get(request.__dedupeKey);
        if (pending) {
          // Store wasUsed on request before deleting from map
          request.__wasUsed = pending.wasUsed;
          // Only reject if the promise was actually used by a deduped request
          if (pending.wasUsed) {
            pending.reject(error);
          }
          pendingRequests.delete(request.__dedupeKey);
        } else if (request.__dedupeReject) {
          // If map was cleared, use the reject function from the request
          // (This only happens when .clear() was called while requests were in flight)
          request.__dedupeReject(error);
        }
      }
      throw error;
    },

    clear() {
      pendingRequests.clear();
    }
  };

  return plugin;
}

export default dedupePlugin;

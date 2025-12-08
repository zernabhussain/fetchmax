import type { Plugin, PluginContext, HttpResponse } from '@fetchmax/core';

export interface ProgressEvent {
  loaded: number;
  total: number;
  percentage: number;
  bytes: string;
}

export interface ProgressConfig {
  onUploadProgress?: (event: ProgressEvent) => void;
  onDownloadProgress?: (event: ProgressEvent) => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

export function progressPlugin(config: ProgressConfig = {}): Plugin {
  const { onUploadProgress: _onUploadProgress, onDownloadProgress } = config;

  return {
    name: 'progress',

    async onRequest(requestConfig: any, context: PluginContext) {
      // Store the original responseType and set it to 'stream' if progress callback is provided
      if (onDownloadProgress) {
        context.originalResponseType = requestConfig.responseType;
        context.progressCallback = onDownloadProgress;
        // Force stream mode so the body isn't consumed before our hook
        requestConfig.responseType = 'stream';
      }
      return requestConfig;
    },

    async onResponse(response: HttpResponse, _request: any, context: PluginContext) {
      // Skip if no callback
      const progressCallback = context.progressCallback as ((event: ProgressEvent) => void) | undefined;
      if (!progressCallback) {
        return response;
      }

      // At this point, response.data should be the ReadableStream (body)
      const body = response.data;

      // Skip if no body or body doesn't support streaming (test environments like MSW)
      // In this case, fallback to parsing the raw response body
      if (!body || typeof body.getReader !== 'function') {
        // Fallback: Parse the raw response if body stream isn't available
        if (response.response && !response.response.bodyUsed) {
          try {
            const text = await response.response.text();
            const contentType = response.headers.get('content-type') || '';
            const originalResponseType = context.originalResponseType as string | undefined;

            if (originalResponseType === 'text' || contentType.includes('text/')) {
              response.data = text;
            } else {
              // Try JSON, fallback to text
              try {
                response.data = JSON.parse(text);
              } catch {
                response.data = text;
              }
            }
          } catch (error) {
            // If parsing fails, keep response as-is
          }
        }
        return response;
      }

      const reader = body.getReader();
      const contentLength = +(response.headers.get('Content-Length') || 0);
      let receivedLength = 0;
      const chunks: Uint8Array[] = [];

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          chunks.push(value);
          receivedLength += value.length;

          progressCallback({
            loaded: receivedLength,
            total: contentLength,
            percentage: contentLength ? (receivedLength / contentLength) * 100 : 0,
            bytes: formatBytes(receivedLength)
          });
        }
      } catch (error) {
        // If reading fails, fallback to parsing the raw response
        if (response.response && !response.response.bodyUsed) {
          try {
            const text = await response.response.text();
            try {
              response.data = JSON.parse(text);
            } catch {
              response.data = text;
            }
          } catch (e) {
            // Keep response as-is
          }
        }
        return response;
      }

      // Reconstruct response data
      const chunksAll = new Uint8Array(receivedLength);
      let position = 0;
      for (const chunk of chunks) {
        chunksAll.set(chunk, position);
        position += chunk.length;
      }

      const text = new TextDecoder().decode(chunksAll);

      // Parse based on original responseType or content-type
      const originalResponseType = context.originalResponseType as string | undefined;
      const contentType = response.headers.get('content-type') || '';

      if (originalResponseType === 'text' || contentType.includes('text/')) {
        response.data = text;
      } else if (originalResponseType === 'blob' || contentType.includes('image/')) {
        response.data = new Blob([chunksAll], { type: contentType });
      } else if (originalResponseType === 'arrayBuffer') {
        response.data = chunksAll.buffer;
      } else {
        // Default: try JSON, fallback to text
        try {
          response.data = JSON.parse(text);
        } catch {
          response.data = text;
        }
      }

      return response;
    }
  };
}

export default progressPlugin;

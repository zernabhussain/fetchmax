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
  const { onUploadProgress, onDownloadProgress } = config;

  return {
    name: 'progress',

    async onResponse(response: HttpResponse, request: any, context: PluginContext) {
      // Skip if no callback or no body or no body.getReader (test environments)
      if (!onDownloadProgress || !response.response.body || typeof response.response.body.getReader !== 'function') {
        return response;
      }

      const reader = response.response.body.getReader();
      const contentLength = +(response.headers.get('Content-Length') || 0);
      let receivedLength = 0;
      const chunks: Uint8Array[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        receivedLength += value.length;

        onDownloadProgress({
          loaded: receivedLength,
          total: contentLength,
          percentage: contentLength ? (receivedLength / contentLength) * 100 : 0,
          bytes: formatBytes(receivedLength)
        });
      }

      // Reconstruct response data
      const chunksAll = new Uint8Array(receivedLength);
      let position = 0;
      for (const chunk of chunks) {
        chunksAll.set(chunk, position);
        position += chunk.length;
      }

      const text = new TextDecoder().decode(chunksAll);
      try {
        response.data = JSON.parse(text);
      } catch {
        response.data = text;
      }

      return response;
    }
  };
}

export default progressPlugin;

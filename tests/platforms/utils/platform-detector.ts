/**
 * Detects the current runtime platform
 */
export function detectPlatform(): string {
  // Check for Deno
  if (typeof (globalThis as any).Deno !== 'undefined') {
    return 'deno';
  }

  // Check for Bun
  if (typeof (globalThis as any).Bun !== 'undefined') {
    return 'bun';
  }

  // Check for browser
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    return 'browser';
  }

  // Check for Node.js
  if (typeof process !== 'undefined' && process.versions?.node) {
    return 'node';
  }

  return 'unknown';
}

/**
 * Gets detailed runtime information
 */
export function getRuntimeInfo(): {
  platform: string;
  version: string;
  userAgent?: string;
} {
  const platform = detectPlatform();

  switch (platform) {
    case 'node':
      return {
        platform: 'node',
        version: process.version,
      };

    case 'deno':
      return {
        platform: 'deno',
        version: (globalThis as any).Deno.version.deno,
      };

    case 'bun':
      return {
        platform: 'bun',
        version: (globalThis as any).Bun.version,
      };

    case 'browser':
      return {
        platform: 'browser',
        version: navigator.appVersion,
        userAgent: navigator.userAgent,
      };

    default:
      return {
        platform: 'unknown',
        version: 'unknown',
      };
  }
}

import { describe, it, expect } from 'vitest';
import {
  aiMockPlugin,
  MockConfigError
} from '@fetchmax/plugin-ai-mock';
import type { AIMockConfig } from '@fetchmax/plugin-ai-mock';

describe('aiMockPlugin', () => {
  it('should create plugin with correct name', () => {
    const config: AIMockConfig = {
      endpoints: {
        '/api/users': {
          structure: {
            id: 'number',
            name: 'string'
          }
        }
      }
    };

    const plugin = aiMockPlugin(config);

    expect(plugin.name).toBe('ai-mock');
  });

  it('should throw error if no endpoints configured', () => {
    expect(() => {
      aiMockPlugin({ endpoints: {} });
    }).toThrow(MockConfigError);
  });

  it('should expose stats method', () => {
    const config: AIMockConfig = {
      endpoints: {
        '/api/users': {
          structure: { id: 'number' }
        }
      }
    };

    const plugin = aiMockPlugin(config) as any;

    expect(plugin.getStats).toBeDefined();
    const stats = plugin.getStats();

    expect(stats).toHaveProperty('totalRequests');
    expect(stats).toHaveProperty('cacheHits');
    expect(stats).toHaveProperty('generatedMocks');
  });

  it('should expose cache stats method', () => {
    const config: AIMockConfig = {
      endpoints: {
        '/api/users': {
          structure: { id: 'number' }
        }
      }
    };

    const plugin = aiMockPlugin(config) as any;

    expect(plugin.getCacheStats).toBeDefined();
    const cacheStats = plugin.getCacheStats();

    expect(cacheStats).toHaveProperty('entries');
    expect(cacheStats).toHaveProperty('totalHits');
  });

  it('should expose clearCache method', () => {
    const config: AIMockConfig = {
      endpoints: {
        '/api/users': {
          structure: { id: 'number' }
        }
      }
    };

    const plugin = aiMockPlugin(config) as any;

    expect(plugin.clearCache).toBeDefined();
    expect(() => plugin.clearCache()).not.toThrow();
  });

  it('should handle method-specific configurations', () => {
    const config: AIMockConfig = {
      endpoints: {
        '/api/users': {
          GET: {
            structure: { id: 'number', name: 'string' }
          },
          POST: {
            structure: { name: 'string', email: 'email' }
          }
        }
      }
    };

    const plugin = aiMockPlugin(config);

    expect(plugin.name).toBe('ai-mock');
  });

  it('should handle wildcard patterns', () => {
    const config: AIMockConfig = {
      endpoints: {
        '/api/users/*': {
          structure: { id: 'number' }
        }
      }
    };

    const plugin = aiMockPlugin(config);

    expect(plugin.name).toBe('ai-mock');
  });

  it('should handle regex patterns', () => {
    const config: AIMockConfig = {
      endpoints: {
        [/^\/api\/users\/\d+$/]: {
          structure: { id: 'number' }
        }
      } as any
    };

    const plugin = aiMockPlugin(config);

    expect(plugin.name).toBe('ai-mock');
  });
});

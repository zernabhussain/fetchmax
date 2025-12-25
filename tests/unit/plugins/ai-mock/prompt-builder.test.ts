import { describe, it, expect } from 'vitest';
import { PromptBuilder } from '@fetchmax/plugin-ai-mock';
import type { MockEndpointConfig } from '@fetchmax/plugin-ai-mock';

describe('PromptBuilder', () => {
  it('should build basic prompt', () => {
    const config: MockEndpointConfig = {
      structure: {
        id: 'number',
        name: 'string',
        email: 'email'
      }
    };

    const prompt = PromptBuilder.buildPrompt(config, '/api/users', 'GET');

    expect(prompt).toContain('GET /api/users');
    expect(prompt).toContain('id: number');
    expect(prompt).toContain('name: string');
    expect(prompt).toContain('email: email');
  });

  it('should include count for arrays', () => {
    const config: MockEndpointConfig = {
      structure: {
        id: 'number',
        name: 'string'
      },
      count: 5
    };

    const prompt = PromptBuilder.buildPrompt(config, '/api/users', 'GET');

    expect(prompt).toContain('array of 5 items');
    expect(prompt).toContain('Return an array of objects');
  });

  it('should include custom instructions', () => {
    const config: MockEndpointConfig = {
      structure: {
        name: 'string',
        country: 'string'
      },
      instructions: 'diverse users from different countries'
    };

    const prompt = PromptBuilder.buildPrompt(config, '/api/users', 'GET');

    expect(prompt).toContain('diverse users from different countries');
  });

  it('should handle complex structures', () => {
    const config: MockEndpointConfig = {
      structure: {
        id: 'number',
        user: {
          type: 'object',
          properties: {
            name: 'string',
            email: 'email'
          }
        }
      }
    };

    const prompt = PromptBuilder.buildPrompt(config, '/api/data', 'GET');

    expect(prompt).toContain('user: object');
    expect(prompt).toContain('Properties:');
    expect(prompt).toContain('name: string');
    expect(prompt).toContain('email: email');
  });

  it('should handle enums', () => {
    const config: MockEndpointConfig = {
      structure: {
        role: {
          type: 'string',
          enum: ['admin', 'user', 'guest']
        }
      }
    };

    const prompt = PromptBuilder.buildPrompt(config, '/api/users', 'GET');

    expect(prompt).toContain('role: string [admin | user | guest]');
  });

  it('should mark optional fields', () => {
    const config: MockEndpointConfig = {
      structure: {
        name: 'string',
        bio: {
          type: 'string',
          required: false
        }
      }
    };

    const prompt = PromptBuilder.buildPrompt(config, '/api/users', 'GET');

    expect(prompt).toContain('bio: string (optional)');
  });

  it('should build JSON schema', () => {
    const structure = {
      id: 'number',
      name: 'string',
      active: 'boolean'
    };

    const schema = PromptBuilder.buildSchema(structure);

    expect(schema.type).toBe('object');
    expect(schema.properties.id.type).toBe('number');
    expect(schema.properties.name.type).toBe('string');
    expect(schema.properties.active.type).toBe('boolean');
    expect(schema.required).toEqual(['id', 'name', 'active']);
  });
});

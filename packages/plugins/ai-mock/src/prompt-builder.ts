import type { MockStructure, MockEndpointConfig } from './types';

/**
 * Prompt Builder
 * Builds AI prompts for generating mock data
 */
export class PromptBuilder {
  /**
   * Build prompt for mock data generation
   */
  static buildPrompt(config: MockEndpointConfig, endpoint: string, method: string): string {
    const { structure, count = 1, instructions } = config;

    let prompt = `Generate realistic mock data for a ${method} ${endpoint} API endpoint.\n\n`;

    // Add structure definition
    prompt += `Response structure:\n${this.formatStructure(structure)}\n\n`;

    // Add count
    if (count > 1) {
      prompt += `Generate an array of ${count} items.\n\n`;
    }

    // Add custom instructions
    if (instructions) {
      prompt += `Additional requirements: ${instructions}\n\n`;
    }

    prompt += `Return ONLY valid JSON without any explanation or markdown formatting. `;

    if (count > 1) {
      prompt += `Return an array of objects.`;
    } else {
      prompt += `Return a single object.`;
    }

    return prompt;
  }

  /**
   * Format structure definition for the prompt
   */
  private static formatStructure(structure: MockStructure, indent = 0): string {
    const spaces = '  '.repeat(indent);
    let result = '';

    for (const [key, value] of Object.entries(structure)) {
      if (typeof value === 'string') {
        result += `${spaces}- ${key}: ${value}\n`;
      } else if (typeof value === 'object' && value !== null) {
        const def = value;
        let typeDesc = def.type;

        if (def.description) {
          typeDesc += ` (${def.description})`;
        }

        if (def.enum) {
          typeDesc += ` [${def.enum.join(' | ')}]`;
        }

        if (def.required === false) {
          typeDesc += ' (optional)';
        }

        result += `${spaces}- ${key}: ${typeDesc}\n`;

        // Handle nested objects
        if (def.properties) {
          result += `${spaces}  Properties:\n`;
          result += this.formatStructure(def.properties, indent + 2);
        }

        // Handle arrays
        if (def.items && typeof def.items === 'object') {
          result += `${spaces}  Items:\n`;
          if (def.items.properties) {
            result += this.formatStructure(def.items.properties, indent + 2);
          }
        }
      }
    }

    return result;
  }

  /**
   * Build schema for JSON validation (optional)
   */
  static buildSchema(structure: MockStructure): any {
    const schema: any = {
      type: 'object',
      properties: {},
      required: []
    };

    for (const [key, value] of Object.entries(structure)) {
      if (typeof value === 'string') {
        schema.properties[key] = { type: this.mapTypeToJsonSchema(value) };
        schema.required.push(key);
      } else if (typeof value === 'object' && value !== null) {
        const def = value;
        schema.properties[key] = {
          type: this.mapTypeToJsonSchema(def.type)
        };

        if (def.enum) {
          schema.properties[key].enum = def.enum;
        }

        if (def.required !== false) {
          schema.required.push(key);
        }

        // Handle nested structures
        if (def.properties) {
          schema.properties[key].properties = this.buildSchema(def.properties).properties;
        }

        if (def.items && typeof def.items === 'object') {
          schema.properties[key].items = {
            type: 'object',
            properties: def.items.properties
              ? this.buildSchema(def.items.properties).properties
              : {}
          };
        }
      }
    }

    return schema;
  }

  /**
   * Map custom types to JSON Schema types
   */
  private static mapTypeToJsonSchema(type: string): string {
    const typeMap: Record<string, string> = {
      string: 'string',
      number: 'number',
      boolean: 'boolean',
      array: 'array',
      object: 'object',
      date: 'string',
      email: 'string',
      url: 'string',
      uuid: 'string'
    };

    return typeMap[type] || 'string';
  }
}

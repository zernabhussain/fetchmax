import { describe, it, expect } from 'vitest';
import { Translator } from '@fetchmax/plugin-ai-translate';

describe('Translator', () => {
  describe('extractTranslatableFields', () => {
    it('should extract string fields from flat object', () => {
      const obj = {
        id: 1,
        name: 'John',
        email: 'john@example.com',
        active: true
      };

      const fields = Translator.extractTranslatableFields(obj);

      expect(fields.size).toBe(2);
      expect(fields.get('name')).toBe('John');
      expect(fields.get('email')).toBe('john@example.com');
    });

    it('should extract string fields from nested object', () => {
      const obj = {
        id: 1,
        user: {
          name: 'John',
          bio: 'Software developer'
        }
      };

      const fields = Translator.extractTranslatableFields(obj);

      expect(fields.size).toBe(2);
      expect(fields.get('user.name')).toBe('John');
      expect(fields.get('user.bio')).toBe('Software developer');
    });

    it('should extract string fields from arrays', () => {
      const obj = {
        users: [
          { name: 'John' },
          { name: 'Jane' }
        ]
      };

      const fields = Translator.extractTranslatableFields(obj);

      expect(fields.size).toBe(2);
      expect(fields.get('users[0].name')).toBe('John');
      expect(fields.get('users[1].name')).toBe('Jane');
    });

    it('should include only specified fields', () => {
      const obj = {
        title: 'Hello',
        description: 'World',
        id: 1
      };

      const fields = Translator.extractTranslatableFields(obj, {
        include: ['title'],
        autoDetect: false
      });

      expect(fields.size).toBe(1);
      expect(fields.get('title')).toBe('Hello');
    });

    it('should exclude specified fields', () => {
      const obj = {
        title: 'Hello',
        description: 'World',
        id: 1
      };

      const fields = Translator.extractTranslatableFields(obj, {
        exclude: ['id']
      });

      expect(fields.size).toBe(2);
      expect(fields.has('id')).toBe(false);
    });

    it('should handle wildcard patterns', () => {
      const obj = {
        user: {
          name: 'John',
          email: 'john@example.com'
        }
      };

      const fields = Translator.extractTranslatableFields(obj, {
        include: ['user.*']
      });

      expect(fields.size).toBe(2);
      expect(fields.get('user.name')).toBe('John');
      expect(fields.get('user.email')).toBe('john@example.com');
    });

    it('should skip empty strings', () => {
      const obj = {
        name: 'John',
        empty: '',
        whitespace: '   '
      };

      const fields = Translator.extractTranslatableFields(obj);

      expect(fields.size).toBe(1);
      expect(fields.get('name')).toBe('John');
    });
  });

  describe('setNestedValue', () => {
    it('should set nested value using dot notation', () => {
      const obj = {
        user: {
          name: 'John'
        }
      };

      Translator.setNestedValue(obj, 'user.email', 'john@example.com');

      expect(obj.user).toHaveProperty('email', 'john@example.com');
    });

    it('should create nested structure if not exists', () => {
      const obj: any = {};

      Translator.setNestedValue(obj, 'user.profile.bio', 'Developer');

      expect(obj.user.profile.bio).toBe('Developer');
    });
  });
});

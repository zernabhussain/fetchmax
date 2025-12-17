/**
 * Base error class for AI Translate plugin
 */
export class AITranslateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AITranslateError';
  }
}

/**
 * Thrown when AI Agent plugin is not found
 */
export class AIAgentNotFoundError extends AITranslateError {
  constructor() {
    super(
      'AI Agent plugin not found. Please install @fetchmax/plugin-ai-agent and add it to your client configuration before using the AI Translate plugin.'
    );
    this.name = 'AIAgentNotFoundError';
  }
}

/**
 * Thrown when translation fails
 */
export class TranslationError extends AITranslateError {
  constructor(
    message: string,
    public readonly language?: string
  ) {
    super(message);
    this.name = 'TranslationError';
  }
}

/**
 * Thrown when translation configuration is invalid
 */
export class TranslationConfigError extends AITranslateError {
  constructor(message: string) {
    super(message);
    this.name = 'TranslationConfigError';
  }
}

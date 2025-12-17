/**
 * Base AI Mock Error
 */
export class AIMockError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'AIMockError';
  }
}

/**
 * Configuration error
 */
export class MockConfigError extends AIMockError {
  constructor(message: string) {
    super(message, 'MOCK_CONFIG_ERROR');
    this.name = 'MockConfigError';
  }
}

/**
 * Mock generation error
 */
export class MockGenerationError extends AIMockError {
  constructor(message: string, public endpoint?: string) {
    super(message, 'MOCK_GENERATION_ERROR');
    this.name = 'MockGenerationError';
  }
}

/**
 * AI Agent not found error
 */
export class AIAgentNotFoundError extends AIMockError {
  constructor() {
    super(
      'AI Agent plugin not found. Please add @fetchmax/plugin-ai-agent before ai-mock plugin.',
      'AI_AGENT_NOT_FOUND'
    );
    this.name = 'AIAgentNotFoundError';
  }
}

/**
 * Invalid structure error
 */
export class InvalidStructureError extends AIMockError {
  constructor(message: string) {
    super(message, 'INVALID_STRUCTURE');
    this.name = 'InvalidStructureError';
  }
}

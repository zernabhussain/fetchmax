export class AITransformError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AITransformError';
  }
}

export class AIAgentNotFoundError extends AITransformError {
  constructor() {
    super(
      'AI Agent plugin not found. Please install @fetchmax/plugin-ai-agent and add it to your client configuration.'
    );
    this.name = 'AIAgentNotFoundError';
  }
}

export class TransformationError extends AITransformError {
  constructor(message: string) {
    super(message);
    this.name = 'TransformationError';
  }
}

export class TransformConfigError extends AITransformError {
  constructor(message: string) {
    super(message);
    this.name = 'TransformConfigError';
  }
}

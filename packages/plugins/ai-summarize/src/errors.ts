export class AISummarizeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AISummarizeError';
  }
}

export class AIAgentNotFoundError extends AISummarizeError {
  constructor() {
    super(
      'AI Agent plugin not found. Please install @fetchmax/plugin-ai-agent and add it to your client configuration.'
    );
    this.name = 'AIAgentNotFoundError';
  }
}

export class SummarizationError extends AISummarizeError {
  constructor(message: string) {
    super(message);
    this.name = 'SummarizationError';
  }
}

export class SummarizeConfigError extends AISummarizeError {
  constructor(message: string) {
    super(message);
    this.name = 'SummarizeConfigError';
  }
}

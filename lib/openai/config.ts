import OpenAI from 'openai';

/**
 * Centralized OpenAI API Configuration
 * 
 * This file provides a single source of truth for OpenAI API access.
 * To update the API key, change the OPENAI_API_KEY environment variable in .env.local
 * 
 * Environment Variables Required:
 * - OPENAI_API_KEY: Your OpenAI API key (required)
 * - OPENAI_MODEL: Model to use (default: "gpt-4")
 * - OPENAI_MAX_TOKENS: Max tokens per request (optional)
 * - OPENAI_TEMPERATURE: Temperature setting (default: 0.3)
 */

// Get API key from environment
export function getOpenAIApiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  
  // Check for placeholder values
  if (apiKey.includes('your-openai-key-here') || apiKey.includes('your_openai_api_key_here')) {
    throw new Error('OPENAI_API_KEY appears to be a placeholder. Please set a valid API key.');
  }
  
  return apiKey;
}

// Get OpenAI model from environment with fallback
export function getOpenAIModel(): string {
  return process.env.OPENAI_MODEL || 'gpt-4';
}

// Get OpenAI configuration
export function getOpenAIConfig() {
  return {
    apiKey: getOpenAIApiKey(),
    model: getOpenAIModel(),
    maxTokens: process.env.OPENAI_MAX_TOKENS ? parseInt(process.env.OPENAI_MAX_TOKENS) : undefined,
    temperature: process.env.OPENAI_TEMPERATURE ? parseFloat(process.env.OPENAI_TEMPERATURE) : 0.3,
  };
}

// Create a singleton OpenAI client instance
let openaiClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: getOpenAIApiKey(),
    });
  }
  return openaiClient;
}

// Helper function for direct API calls (for routes that need fetch)
export function getOpenAIHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getOpenAIApiKey()}`,
  };
}

// Validate API key is configured
export function isOpenAIConfigured(): boolean {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    return !!apiKey && 
           !apiKey.includes('your-openai-key-here') && 
           !apiKey.includes('your_openai_api_key_here');
  } catch {
    return false;
  }
}


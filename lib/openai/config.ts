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

// Check if we're in build mode - be very permissive to avoid build errors
function isBuildTime(): boolean {
  // Check multiple indicators of build time
  return (
    process.env.NEXT_PHASE === 'phase-production-build' ||
    process.env.NEXT_PHASE === 'phase-development-build' ||
    (typeof process.env.VERCEL === 'undefined' && process.env.NODE_ENV === 'production') ||
    process.env.CI === 'true' ||
    // If we're collecting page data during build
    process.env.__NEXT_PRIVATE_ROUTER_BASEPATH !== undefined
  );
}

// Get API key from environment - never throw during build
export function getOpenAIApiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY;
  const isBuild = isBuildTime();
  
  // During build or when key is missing, return empty string (will be validated at runtime)
  // Never throw during build - this allows Next.js to statically analyze routes
  if (!apiKey) {
    if (isBuild) {
      return '';
    }
    // Only throw at runtime when key is actually needed
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  
  // During build, return the key as-is (even if it's a placeholder, we'll validate at runtime)
  if (isBuild) {
    return apiKey;
  }
  
  // Check for placeholder values (only at runtime)
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
  // During build, always return a dummy client that won't be used
  if (isBuildTime()) {
    return new OpenAI({ apiKey: 'dummy-key-for-build-time-only' });
  }
  
  if (!openaiClient) {
    const apiKey = getOpenAIApiKey();
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openaiClient = new OpenAI({
      apiKey,
    });
  }
  return openaiClient;
}

// Helper function for direct API calls (for routes that need fetch)
export function getOpenAIHeaders(): Record<string, string> {
  // During build, return dummy headers
  if (isBuildTime()) {
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer dummy-key-for-build-time-only',
    };
  }
  
  const apiKey = getOpenAIApiKey();
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
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


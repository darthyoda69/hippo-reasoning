/**
 * Hippo Reasoning — Cross-Model Provider Abstraction
 *
 * Supports Anthropic, OpenAI, and Google AI providers.
 * Returns only providers whose API keys are configured in environment variables.
 */

import type { LanguageModel } from 'ai';

// ─── Types ───────────────────────────────────────────────────────────

export interface ModelProvider {
  id: string;
  name: string;
  model: () => LanguageModel;
}

// ─── Provider Definitions ────────────────────────────────────────────

const providers: ModelProvider[] = [
  {
    id: 'anthropic',
    name: 'Anthropic Claude Sonnet',
    model: () => {
      const { anthropic } = require('@ai-sdk/anthropic');
      return anthropic('claude-sonnet-4-20250514');
    },
  },
  {
    id: 'openai',
    name: 'OpenAI GPT-4o',
    model: () => {
      const { openai } = require('@ai-sdk/openai');
      return openai('gpt-4o');
    },
  },
  {
    id: 'google',
    name: 'Google Gemini 2.0 Flash',
    model: () => {
      const { google } = require('@ai-sdk/google');
      return google('gemini-2.0-flash');
    },
  },
];

// ─── Environment variable mapping ────────────────────────────────────

const ENV_KEYS: Record<string, string> = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  google: 'GOOGLE_GENERATIVE_AI_API_KEY',
};

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Returns providers whose API keys are set in the environment.
 */
export function getAvailableProviders(): ModelProvider[] {
  return providers.filter((p) => !!process.env[ENV_KEYS[p.id]]);
}

/**
 * Returns the AI SDK model instance for the given provider id.
 * Falls back to the first available provider if the requested one
 * is not available or not specified.
 */
export function getModel(providerId?: string): { model: LanguageModel; providerId: string } {
  const available = getAvailableProviders();

  if (available.length === 0) {
    throw new Error(
      'No AI provider API keys configured. Set at least one of: ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY',
    );
  }

  // Try the requested provider first
  if (providerId) {
    const requested = available.find((p) => p.id === providerId);
    if (requested) {
      return { model: requested.model(), providerId: requested.id };
    }
  }

  // Fall back to first available
  const fallback = available[0];
  return { model: fallback.model(), providerId: fallback.id };
}

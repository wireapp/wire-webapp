/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

import {zodToJsonSchema} from 'zod-to-json-schema';

import {getLogger} from 'Util/logger';

import {OllamaModelMissingError, OllamaUnreachableError} from './errors';
import type {OllamaChatArgs, OllamaChatResponse, OllamaModelInfo} from './OllamaTypes';

import {FinalReportToolArgsSchema, SubReportIncrementalToolArgsSchema, SubReportToolArgsSchema} from '../domain/EntryTypes';

const log = getLogger('AI/Ollama');

interface OllamaToolDefinition {
  type: string;
  function: {name: string; description: string; parameters: unknown};
}

/** Raw entry from GET /api/tags models array. */
interface OllamaTagEntry {
  name: string;
  size: number;
  details?: {parameter_size?: string; quantization_level?: string};
}

/** Raw response body from POST /api/show. */
interface OllamaShowResponse {
  model_info?: Record<string, unknown>;
  parameters?: string;
  template?: string;
  modelfile?: string;
}

// ---------------------------------------------------------------------------
// Module-level helpers for parsing /api/show data into OllamaModelInfo fields
// ---------------------------------------------------------------------------

function parseContextLength(modelInfo: Record<string, unknown>): number | null {
  for (const key of Object.keys(modelInfo)) {
    const value = modelInfo[key];
    // Nested form: model_info.<arch> = { context_length: number, ... }
    if (typeof value === 'object' && value !== null && 'context_length' in value) {
      const ctx = (value as {context_length: unknown}).context_length;
      if (typeof ctx === 'number' && ctx > 0) {
        return ctx;
      }
    }
    // Flat form: model_info['<arch>.context_length'] = number
    if (typeof value === 'number' && key.endsWith('.context_length')) {
      return value;
    }
  }
  return null;
}

function parseMaxOutputTokens(parameters: string | undefined): number | null {
  if (!parameters) {
    return null;
  }
  const match = /num_predict\s+(\d+)/.exec(parameters);
  return match ? parseInt(match[1], 10) : null;
}

function detectToolSupport(template: string): boolean {
  return template.includes('.Tools');
}

function detectThinkingSupport(template: string, modelfile: string): boolean {
  return template.includes('.Think') || template.includes('IsThinkSet') || /RENDERER\s+\S/.test(modelfile);
}

function buildModelInfo(entry: OllamaTagEntry, show: OllamaShowResponse | null): OllamaModelInfo {
  return {
    name: entry.name,
    sizeBytes: entry.size,
    parameterSize: entry.details?.parameter_size ?? '',
    quantization: entry.details?.quantization_level ?? '',
    contextLength: show !== null ? parseContextLength(show.model_info ?? {}) : null,
    maxOutputTokens: show !== null ? parseMaxOutputTokens(show.parameters) : null,
    supportsTools: show !== null ? detectToolSupport(show.template ?? '') : null,
    supportsThinking: show !== null ? detectThinkingSupport(show.template ?? '', show.modelfile ?? '') : null,
  };
}

/**
 * Converts a Zod schema to an OpenAPI-3 JSON Schema object.
 * @remarks `zodToJsonSchema` has deeply-nested generic overloads that trigger TS2589
 * ("Type instantiation is excessively deep"); the `as any` cast is the library-recommended workaround.
 * The returned shape is always a plain JSON-serialisable object passed verbatim to Ollama.
 */
const schemaToJsonSchema = (schema: unknown): unknown => (zodToJsonSchema as any)(schema, {target: 'openApi3'});

/** Ollama tool definition for the per-conversation sub-report LLM call. */
export const SUB_REPORT_TOOL: OllamaToolDefinition = {
  type: 'function',
  function: {
    name: 'report_completion',
    description: 'Submit the array of report entries extracted from the conversation.',
    parameters: schemaToJsonSchema(SubReportToolArgsSchema),
  },
};

/** Ollama tool definition for incremental re-scan: create new entries or update existing ones. */
export const SUB_REPORT_INCREMENTAL_TOOL: OllamaToolDefinition = {
  type: 'function',
  function: {
    name: 'report_completion',
    description:
      'Submit the list of actions (create or update) for this incremental scan pass. Omit entries that require no change.',
    parameters: schemaToJsonSchema(SubReportIncrementalToolArgsSchema),
  },
};

/** Ollama tool definition for the final-merge LLM call. */
export const FINAL_REPORT_TOOL: OllamaToolDefinition = {
  type: 'function',
  function: {
    name: 'report_completion',
    description: 'Submit the merged, deduplicated final array of report entries.',
    parameters: schemaToJsonSchema(FinalReportToolArgsSchema),
  },
};

/** HTTP client for the local Ollama API. */
export class OllamaClient {
  /** Resolved base URL for all fetch calls. On HTTPS pages, routes through the Wire server proxy to avoid mixed-content blocking. */
  private readonly fetchBase: string;

  constructor(
    private readonly url: string,
    private readonly model: string,
  ) {
    // typeof window check guards against jsdom in tests (which have window but no real location).
    const isHttpsPage = typeof window !== 'undefined' && window.location?.protocol === 'https:';
    this.fetchBase = isHttpsPage ? '/proxy/ollama' : url;
  }

  /** Extra headers required when routing through the server proxy. */
  private get proxyHeaders(): Record<string, string> {
    return this.fetchBase !== this.url ? {'X-Ollama-Target': this.url} : {};
  }

  /** Hits /api/tags to verify reachability and returns installed model names. */
  async listModels(): Promise<string[]> {
    try {
      const res = await fetch(`${this.fetchBase}/api/tags`, {headers: this.proxyHeaders});
      if (!res.ok) {
        throw new OllamaUnreachableError(`/api/tags returned status ${res.status}`);
      }
      const json = (await res.json()) as {models?: Array<{name: string}>};
      return (json.models ?? []).map(m => m.name);
    } catch (err) {
      if (err instanceof OllamaUnreachableError) {
        throw err;
      }
      throw new OllamaUnreachableError(`Cannot reach Ollama at ${this.url}: ${(err as Error).message}`);
    }
  }

  /**
   * Calls /api/show and extracts context_length from model_info.
   * Returns null if context_length cannot be determined.
   */
  async getContextLength(): Promise<number | null> {
    const res = await fetch(`${this.fetchBase}/api/show`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', ...this.proxyHeaders},
      body: JSON.stringify({model: this.model}),
    });
    if (!res.ok) {
      if (res.status === 404) {
        throw new OllamaModelMissingError(this.model);
      }
      throw new OllamaUnreachableError(`/api/show returned status ${res.status}`);
    }
    const json = (await res.json()) as OllamaShowResponse;
    return parseContextLength(json.model_info ?? {});
  }

  /**
   * Fetches the model list from /api/tags then calls /api/show in parallel for each model
   * to collect rich metadata (context length, tool/thinking support, etc.).
   */
  async listModelsWithDetails(): Promise<OllamaModelInfo[]> {
    let tagsRes: Response;
    try {
      tagsRes = await fetch(`${this.fetchBase}/api/tags`, {headers: this.proxyHeaders});
      if (!tagsRes.ok) {
        throw new OllamaUnreachableError(`/api/tags returned status ${tagsRes.status}`);
      }
    } catch (err) {
      if (err instanceof OllamaUnreachableError) {
        throw err;
      }
      throw new OllamaUnreachableError(`Cannot reach Ollama at ${this.url}: ${(err as Error).message}`);
    }

    const tagsJson = (await tagsRes.json()) as {models?: OllamaTagEntry[]};
    const entries = tagsJson.models ?? [];

    return Promise.all(
      entries.map(async entry => {
        try {
          const showRes = await fetch(`${this.fetchBase}/api/show`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json', ...this.proxyHeaders},
            body: JSON.stringify({model: entry.name}),
          });
          if (!showRes.ok) {
            return buildModelInfo(entry, null);
          }
          const show = (await showRes.json()) as OllamaShowResponse;
          return buildModelInfo(entry, show);
        } catch {
          return buildModelInfo(entry, null);
        }
      }),
    );
  }

  /**
   * Sends a trivial prompt via /api/generate to verify the configured model is loaded and responsive.
   * Does not use tool-calling so it works even with models that don't support function calling.
   */
  async testPrompt(signal?: AbortSignal): Promise<string> {
    let res: Response;
    try {
      res = await fetch(`${this.fetchBase}/api/generate`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', ...this.proxyHeaders},
        body: JSON.stringify({model: this.model, prompt: 'Reply with just the word: ok', stream: false}),
        signal,
      });
    } catch (err) {
      throw new OllamaUnreachableError(`Network error during /api/generate: ${(err as Error).message}`);
    }
    if (!res.ok) {
      if (res.status === 404) {
        throw new OllamaModelMissingError(this.model);
      }
      throw new OllamaUnreachableError(`/api/generate returned status ${res.status}`);
    }
    const json = (await res.json()) as {response?: string};
    return json.response ?? '';
  }

  /** Sends a chat request with tool definitions. Returns the full response. */
  async chat({messages, tools, toolChoice = 'auto', numCtx, signal}: OllamaChatArgs): Promise<OllamaChatResponse> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages,
      tools,
      stream: false,
      tool_choice: toolChoice,
    };

    if (typeof numCtx === 'number') {
      body.options = {num_ctx: numCtx};
    }

    log.debug('POST /api/chat', {model: this.model, numCtx, messageCount: messages.length, toolChoice});

    let res: Response;
    try {
      res = await fetch(`${this.fetchBase}/api/chat`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', ...this.proxyHeaders},
        body: JSON.stringify(body),
        signal,
      });
    } catch (err) {
      throw new OllamaUnreachableError(`Network error during /api/chat: ${(err as Error).message}`);
    }

    if (!res.ok) {
      if (res.status === 404) {
        throw new OllamaModelMissingError(this.model);
      }
      throw new OllamaUnreachableError(`/api/chat returned status ${res.status}`);
    }

    return (await res.json()) as OllamaChatResponse;
  }
}

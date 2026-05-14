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

import {OllamaUnreachableError, OllamaModelMissingError} from './errors';

import {SubReportToolArgsSchema, FinalReportToolArgsSchema} from '../domain/EntryTypes';

const log = getLogger('AI/Ollama');

/**
 * Represents a single message in the conversation history sent to Ollama.
 * Maps directly to the Ollama chat API message shape.
 */
export interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
}

/**
 * Represents a tool call returned by Ollama in the response.
 * The arguments field is typed as unknown because Ollama may return either
 * a JSON object or a JSON-encoded string depending on server version.
 * The pipeline layer above this client normalizes it.
 */
export interface OllamaToolCall {
  function: {name: string; arguments: unknown};
}

/**
 * The full response from Ollama's /api/chat endpoint.
 * Includes message content, optional tool calls, completion flag, and optional timing metrics.
 */
export interface OllamaChatResponse {
  message: {
    content: string;
    tool_calls?: OllamaToolCall[];
  };
  done: boolean;
  total_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

/**
 * Arguments for the OllamaClient.chat() method.
 * toolChoice defaults to 'auto' (Q&A R1 Q8 / D26) and must not be 'required'.
 */
export interface OllamaChatArgs {
  messages: OllamaChatMessage[];
  tools: unknown[];
  /** ollama-side option: forces tool call. Default 'auto' (Q&A R1 Q8 / D26). */
  toolChoice?: 'auto' | 'required';
  /** ollama 'num_ctx' override */
  numCtx?: number;
  signal?: AbortSignal;
}

/**
 * HTTP client for Ollama endpoints.
 * Provides three core methods: listModels, getContextLength, and chat.
 */
export class OllamaClient {
  constructor(
    private readonly url: string,
    private readonly model: string,
  ) {}

  /** Verifies reachability + returns available model names. */
  async listModels(): Promise<string[]> {
    try {
      const res = await fetch(`${this.url}/api/tags`);
      if (!res.ok) {
        throw new OllamaUnreachableError(`/api/tags status ${res.status}`);
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
   * Calls /api/show. Tries to extract context_length from the first model_info architecture
   * key whose value has `context_length` (Q&A R1 Q9 / D15).
   * Handles both nested form (older Ollama) and flat form (newer Ollama).
   */
  async getContextLength(): Promise<number | null> {
    const res = await fetch(`${this.url}/api/show`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({model: this.model}),
    });
    if (!res.ok) {
      if (res.status === 404) {
        throw new OllamaModelMissingError(this.model);
      }
      throw new OllamaUnreachableError(`/api/show status ${res.status}`);
    }
    const json = (await res.json()) as {model_info?: Record<string, unknown>};
    const modelInfo = json.model_info ?? {};
    for (const key of Object.keys(modelInfo)) {
      const value = modelInfo[key];
      if (typeof value === 'object' && value !== null && 'context_length' in value) {
        const ctx = (value as {context_length: unknown}).context_length;
        if (typeof ctx === 'number' && ctx > 0) {
          return ctx;
        }
      }
      // Some Ollama versions place context_length at the top level keyed `<arch>.context_length`.
      if (typeof value === 'number' && key.endsWith('.context_length')) {
        return value;
      }
    }
    return null;
  }

  /** Sends one chat request with tool definitions, returns the parsed message. */
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
      res = await fetch(`${this.url}/api/chat`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
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
      throw new OllamaUnreachableError(`/api/chat status ${res.status}`);
    }
    const json = (await res.json()) as OllamaChatResponse;
    return json;
  }
}

/** JSON Schema tool definition for the per-conversation sub-report extraction call. */
export const SUB_REPORT_TOOL = {
  type: 'function',
  function: {
    name: 'report_completion',
    description: 'Submit the array of report entries extracted from the conversation.',
    // @ts-expect-error: Complex Zod schema causes type instantiation depth limit; safe at runtime
    parameters: zodToJsonSchema(SubReportToolArgsSchema, {target: 'openApi3'}),
  },
} as const;

/** JSON Schema tool definition for the final merge/dedupe report call. */
export const FINAL_REPORT_TOOL = {
  type: 'function',
  function: {
    name: 'report_completion',
    description: 'Submit the merged, deduplicated final array of report entries.',
    // @ts-expect-error: Complex Zod schema causes type instantiation depth limit; safe at runtime
    parameters: zodToJsonSchema(FinalReportToolArgsSchema, {target: 'openApi3'}),
  },
} as const;

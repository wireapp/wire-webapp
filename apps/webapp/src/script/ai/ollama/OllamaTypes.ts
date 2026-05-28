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

/** A single message in an Ollama chat conversation. */
export interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
}

/** A tool call returned by the Ollama model. */
export interface OllamaToolCall {
  function: {name: string; arguments: unknown};
}

/** The full response object from POST /api/chat. */
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

/** Arguments for OllamaClient.chat(). */
export interface OllamaChatArgs {
  messages: OllamaChatMessage[];
  /** Already-JSON-Schema tool definitions (derived by zod-to-json-schema). */
  tools: unknown[];
  /** Always 'auto' per D26 / Q&A R1 Q8. */
  toolChoice?: 'auto' | 'required';
  /** Optional num_ctx override sent as options.num_ctx to Ollama. */
  numCtx?: number;
  signal?: AbortSignal;
}

/** Rich metadata about a single Ollama model, combining /api/tags and /api/show data. */
export interface OllamaModelInfo {
  name: string;
  /** Raw disk size in bytes (from /api/tags). */
  sizeBytes: number;
  /** Human-readable parameter count, e.g. "35B" (from /api/tags details.parameter_size). */
  parameterSize: string;
  /** Quantization level, e.g. "Q4_K_M" (from /api/tags details.quantization_level). */
  quantization: string;
  /** Max context length in tokens (from /api/show model_info). Null if undetermined. */
  contextLength: number | null;
  /** Max output tokens (from /api/show parameters num_predict line). Null if not configured. */
  maxOutputTokens: number | null;
  /** Whether the model template includes tool-calling support. Null if /api/show failed. */
  supportsTools: boolean | null;
  /** Whether the model supports thinking/reasoning mode. Null if /api/show failed. */
  supportsThinking: boolean | null;
}

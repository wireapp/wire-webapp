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

/** Thrown when Ollama cannot be reached (network error, server not running). */
export class OllamaUnreachableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OllamaUnreachableError';
  }
}

/** Thrown when the configured model is not installed in the local Ollama instance. */
export class OllamaModelMissingError extends Error {
  constructor(public readonly model: string) {
    super(`Ollama model not installed: ${model}`);
    this.name = 'OllamaModelMissingError';
  }
}

/** Thrown when the Ollama response did not include a tool call (D26 / Q&A R1 Q8). */
export class OllamaToolCallMissingError extends Error {
  constructor() {
    super('Ollama response did not contain a tool call');
    this.name = 'OllamaToolCallMissingError';
  }
}

/** Thrown when the Ollama tool call arguments did not match the expected Zod schema. */
export class OllamaToolCallInvalidError extends Error {
  constructor(public readonly zodIssues: unknown) {
    super('Ollama tool call did not match expected schema');
    this.name = 'OllamaToolCallInvalidError';
  }
}

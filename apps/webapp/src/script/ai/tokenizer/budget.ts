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

export interface BudgetInputs {
  /** The model's total context window in tokens, sourced from Ollama /api/show or a fallback setting. */
  contextSize: number;
  /** Token count of the static prompt (system instruction, framing) measured with the conversation block stripped. */
  promptOverheadTokens: number;
  /** Fraction to withhold from context (e.g., 0.2 for 20% safety margin). */
  safetyMarginPct: number;
}

export interface Budget {
  /** The effective context size after subtracting the safety margin. */
  totalAllowed: number;
  /** The number of tokens available for transcript content (totalAllowed - promptOverheadTokens, clamped to ≥ 0). */
  forTranscript: number;
}

/**
 * Computes the token budget for a given model context size and overhead.
 * @param contextSize The model's total context window in tokens.
 * @param promptOverheadTokens The token cost of the static prompt structure (measured with conversation block stripped).
 * @param safetyMarginPct The fraction to withhold for safety (e.g., 0.2 for 20%). With safetyMarginPct = 0.2, the effective context is 80% of the reported context size.
 * @returns A Budget object with totalAllowed and forTranscript fields.
 * @note forTranscript is clamped to ≥ 0 using Math.max(0, ...) to prevent infinite loops in truncateTranscript.
 * forTranscript represents the token budget available exclusively for transcript lines.
 */
export const computeBudget = ({contextSize, promptOverheadTokens, safetyMarginPct}: BudgetInputs): Budget => {
  const totalAllowed = Math.floor(contextSize * (1 - safetyMarginPct));
  const forTranscript = Math.max(0, totalAllowed - promptOverheadTokens);
  return {totalAllowed, forTranscript};
};

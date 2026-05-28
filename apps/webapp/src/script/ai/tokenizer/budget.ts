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

/** Inputs for computing the token budget available for the transcript. */
export interface BudgetInputs {
  /** Context window size from Ollama /api/show or the fallback manual setting. */
  contextSize: number;
  /** Token count of the prompt with the transcript block stripped (measured separately). */
  promptOverheadTokens: number;
  /** Safety margin fraction, e.g. 0.2 for 20%. */
  safetyMarginPct: number;
}

/** Result of computeBudget. */
export interface Budget {
  /** Total tokens allowed after applying the safety margin. */
  totalAllowed: number;
  /** Tokens available for the transcript (totalAllowed minus promptOverheadTokens). */
  forTranscript: number;
}

/**
 * Computes how many tokens are available for the conversation transcript.
 * Applies a safety margin to guard against token-count estimation inaccuracy.
 */
export const computeBudget = ({contextSize, promptOverheadTokens, safetyMarginPct}: BudgetInputs): Budget => {
  const totalAllowed = Math.floor(contextSize * (1 - safetyMarginPct));
  const forTranscript = Math.max(0, totalAllowed - promptOverheadTokens);
  return {totalAllowed, forTranscript};
};

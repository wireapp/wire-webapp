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

import {countTokens} from './tokenize';

const TRUNCATION_SUFFIX = ' …[truncated]';

export interface TruncateResult {
  /** The processed transcript lines after both truncation stages (stage 1 hard-truncation and stage 2 oldest-first drops). */
  lines: string[];
  /** Count of whole lines removed by stage 2 (oldest-first drops). */
  droppedFromStart: number;
  /** Count of lines that had their content hard-truncated in stage 1 (per-message cap). */
  truncatedPerMessage: number;
}

/**
 * Truncates a transcript to fit within token budgets using a two-stage algorithm.
 *
 * Stage 1 (per-message hard truncation): Any single transcript line whose tokenized length exceeds
 * perMessageCap is hard-truncated by characters (keep head, append the truncation suffix).
 *
 * Stage 2 (oldest-first whole-line drops): Drop entire lines from the front (oldest first) until
 * the total token count fits within forTranscript.
 *
 * @param lines The array of transcript lines to truncate.
 * @param forTranscript The token budget available for the entire transcript (after prompt overhead).
 * @param perMessageCap The maximum token count allowed for a single transcript line.
 * @returns A TruncateResult with the processed lines and counters for dropped/truncated messages.
 * @note The per-message truncation uses targetChars = Math.max(1, Math.floor(perMessageCap * 3)),
 * which approximates 3 characters per token (conservative estimate).
 * @note Summing individual line token counts (naive approach) overcounts relative to tokenizing
 * the full joined string, because BPE doesn't tokenize at line boundaries. However, this
 * approximation is acceptable given the 20% safety margin applied at the budget layer.
 */
export const truncateTranscript = (lines: string[], forTranscript: number, perMessageCap: number): TruncateResult => {
  // Stage 1: per-message hard truncation
  let truncatedPerMessage = 0;
  const stepOne = lines.map(line => {
    if (countTokens(line) <= perMessageCap) {
      return line;
    }
    truncatedPerMessage += 1;
    const targetChars = Math.max(1, Math.floor(perMessageCap * 3));
    return line.slice(0, targetChars) + TRUNCATION_SUFFIX;
  });

  // Stage 2: oldest-first whole-line drops
  let total = stepOne.reduce((sum, l) => sum + countTokens(l), 0);
  const out = [...stepOne];
  let droppedFromStart = 0;
  while (total > forTranscript && out.length > 0) {
    const dropped = out.shift();
    if (dropped) {
      total -= countTokens(dropped);
      droppedFromStart += 1;
    }
  }

  return {lines: out, droppedFromStart, truncatedPerMessage};
};

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

/** Result of truncateTranscript. */
export interface TruncateResult {
  lines: string[];
  droppedFromStart: number;
  truncatedPerMessage: number;
}

/**
 * Two-stage transcript truncation:
 * 1. Per-message truncation: any line exceeding perMessageCap tokens is hard-truncated (head kept, suffix appended).
 * 2. Oldest-first truncation: drops lines from the front until total fits within forTranscript.
 *
 * Order matters: per-message truncation MUST run before oldest-first truncation.
 */
export const truncateTranscript = (lines: string[], forTranscript: number, perMessageCap: number): TruncateResult => {
  let truncatedPerMessage = 0;

  // Stage 1: per-message cap
  const stepOne = lines.map(line => {
    if (countTokens(line) <= perMessageCap) {
      return line;
    }
    truncatedPerMessage += 1;
    // Approximate: keep ~3 chars per token then append the suffix
    const targetChars = Math.max(1, Math.floor(perMessageCap * 3));
    return line.slice(0, targetChars) + TRUNCATION_SUFFIX;
  });

  // Stage 2: oldest-first drop
  let total = stepOne.reduce((sum, l) => sum + countTokens(l), 0);
  let droppedFromStart = 0;
  const out = [...stepOne];

  while (total > forTranscript && out.length > 0) {
    const dropped = out.shift();
    if (dropped !== undefined) {
      total -= countTokens(dropped);
      droppedFromStart += 1;
    }
  }

  return {lines: out, droppedFromStart, truncatedPerMessage};
};

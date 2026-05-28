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

import {computeBudget} from '../tokenizer/budget';

describe('computeBudget', () => {
  it('computes totalAllowed and forTranscript with a 20% safety margin', () => {
    const result = computeBudget({
      contextSize: 10000,
      promptOverheadTokens: 2000,
      safetyMarginPct: 0.2,
    });

    // totalAllowed = floor(10000 * (1 - 0.2)) = 8000
    expect(result.totalAllowed).toBe(8000);
    // forTranscript = 8000 - 2000 = 6000
    expect(result.forTranscript).toBe(6000);
  });

  it('computes totalAllowed and forTranscript with a 10% safety margin and small context', () => {
    const result = computeBudget({
      contextSize: 1000,
      promptOverheadTokens: 500,
      safetyMarginPct: 0.1,
    });

    // totalAllowed = floor(1000 * (1 - 0.1)) = 900
    expect(result.totalAllowed).toBe(900);
    // forTranscript = 900 - 500 = 400
    expect(result.forTranscript).toBe(400);
  });

  it('clamps forTranscript to 0 when overhead exceeds totalAllowed', () => {
    const result = computeBudget({
      contextSize: 1000,
      promptOverheadTokens: 5000,
      safetyMarginPct: 0.2,
    });

    // totalAllowed = floor(1000 * 0.8) = 800
    expect(result.totalAllowed).toBe(800);
    // overhead (5000) > totalAllowed (800) → forTranscript must not go negative
    expect(result.forTranscript).toBe(0);
  });

  it('returns forTranscript = 0 when overhead exactly equals totalAllowed', () => {
    const result = computeBudget({
      contextSize: 2000,
      promptOverheadTokens: 2000,
      safetyMarginPct: 0.0,
    });

    expect(result.totalAllowed).toBe(2000);
    expect(result.forTranscript).toBe(0);
  });
});

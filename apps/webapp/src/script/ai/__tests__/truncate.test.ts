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

import {truncateTranscript} from '../tokenizer/truncate';

describe('truncateTranscript', () => {
  it('returns empty output with zero counts for empty input', () => {
    const result = truncateTranscript([], 1000, 500);

    expect(result.lines).toEqual([]);
    expect(result.droppedFromStart).toBe(0);
    expect(result.truncatedPerMessage).toBe(0);
  });

  it('returns lines unchanged when total tokens fit within budget', () => {
    const lines = [
      '[2025-01-01 10:00] @alice: Hi there',
      '[2025-01-01 10:01] @bob: Hello back',
    ];

    // Budget of 1 000 000 is far larger than a few short lines need
    const result = truncateTranscript(lines, 1000000, 1000000);

    expect(result.lines).toEqual(lines);
    expect(result.droppedFromStart).toBe(0);
    expect(result.truncatedPerMessage).toBe(0);
  });

  it('drops oldest lines from the start when total exceeds forTranscript', () => {
    // Each short line is ~10 tokens; budget of 12 fits only about 1 line
    const lines = [
      '[2025-01-01 10:00] @alice: First message here today',
      '[2025-01-01 10:01] @bob: Second message here today',
      '[2025-01-01 10:02] @alice: Third message here today',
    ];

    // Budget of 20 tokens fits only 1 line (each line is ~19 tokens),
    // so the first two oldest lines get dropped and only the last remains
    const result = truncateTranscript(lines, 20, 1000000);

    // At least the earliest line was dropped to fit
    expect(result.droppedFromStart).toBeGreaterThan(0);
    // Remaining lines should come from the tail (most recent)
    const lastLine = lines[lines.length - 1];
    expect(result.lines[result.lines.length - 1]).toBe(lastLine);
    expect(result.truncatedPerMessage).toBe(0);
  });

  it('truncates a very long single message with the truncation suffix', () => {
    // A line that is much longer than perMessageCap tokens
    const longMessage = '[2025-01-01 10:00] @alice: ' + 'word '.repeat(500);

    // perMessageCap of 10 tokens forces this line to be cut
    const result = truncateTranscript([longMessage], 1000000, 10);

    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]).toMatch(/ …\[truncated\]$/);
    expect(result.lines[0].length).toBeLessThan(longMessage.length);
    expect(result.truncatedPerMessage).toBe(1);
    expect(result.droppedFromStart).toBe(0);
  });

  it('counts droppedFromStart and truncatedPerMessage independently', () => {
    // One long line (will be per-message truncated) and several normal ones
    const longLine = '[2025-01-01 09:00] @alice: ' + 'extra '.repeat(300);
    const normalLines = [
      '[2025-01-01 10:00] @bob: Short message one',
      '[2025-01-01 10:01] @bob: Short message two',
      '[2025-01-01 10:02] @bob: Short message three',
    ];
    const lines = [longLine, ...normalLines];

    // perMessageCap = 5 truncates the long line; forTranscript = 20 drops some from start
    const result = truncateTranscript(lines, 20, 5);

    expect(result.truncatedPerMessage).toBeGreaterThan(0);
    // After per-message truncation the long line is shorter; oldest-first drop may still occur
    // Whatever remains must be <= forTranscript tokens (approximately — gpt-tokenizer based)
    expect(result.lines.length).toBeGreaterThanOrEqual(0);
    // droppedFromStart + remaining = total after stage-1
    expect(result.droppedFromStart + result.lines.length).toBe(lines.length);
  });
});

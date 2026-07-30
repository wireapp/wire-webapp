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

import {writeFailure, writeSummarySafely} from './releaseAppearanceCommandOutput.ts';

describe('release appearance command output', (): void => {
  it('does not throw when failure output itself fails', async (): Promise<void> => {
    await expect(
      writeFailure({
        message: 'failure',
        async writeOutput(): Promise<void> {
          throw new Error('output failed');
        },
      }),
    ).resolves.toBeUndefined();
  });

  it('reports successful summary writes', async (): Promise<void> => {
    const summaries: string[] = [];

    await expect(
      writeSummarySafely({
        summary: 'summary',
        githubToken: 'token',
        async writeSummary(summary: string): Promise<void> {
          summaries.push(summary);
        },
        async writeOutput(): Promise<void> {},
      }),
    ).resolves.toBe(true);

    expect(summaries).toEqual(['summary']);
  });

  it('reports and redacts failed summary writes', async (): Promise<void> => {
    const outputMessages: string[] = [];

    await expect(
      writeSummarySafely({
        summary: 'summary',
        githubToken: 'secret-token',
        async writeSummary(): Promise<void> {
          throw new Error('request failed with secret-token');
        },
        async writeOutput(message: string): Promise<void> {
          outputMessages.push(message);
        },
      }),
    ).resolves.toBe(false);

    expect(outputMessages).toEqual(['Unable to write GitHub Actions summary: request failed with [REDACTED]']);
  });
});

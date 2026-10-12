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

import {createGitHubMutationPacer, githubMutationMinimumIntervalMilliseconds} from './githubMutationPacer.ts';

describe('GitHub mutation pacer', () => {
  it('serializes concurrent mutations and separates their starts without real waiting', async () => {
    let currentTimeMilliseconds = 0;
    let activeMutations = 0;
    let maximumActiveMutations = 0;
    const mutationStartTimes: number[] = [];
    const sleepDelays: number[] = [];
    const mutationPacer = createGitHubMutationPacer({
      currentTimeMilliseconds() {
        return currentTimeMilliseconds;
      },
      minimumIntervalMilliseconds: githubMutationMinimumIntervalMilliseconds,
      async sleep(delayMilliseconds) {
        sleepDelays.push(delayMilliseconds);
        currentTimeMilliseconds += delayMilliseconds;
      },
    });

    async function recordMutationStart(): Promise<void> {
      activeMutations += 1;
      maximumActiveMutations = Math.max(maximumActiveMutations, activeMutations);
      mutationStartTimes.push(currentTimeMilliseconds);
      activeMutations -= 1;
    }

    await Promise.all([
      mutationPacer.run(recordMutationStart),
      mutationPacer.run(recordMutationStart),
      mutationPacer.run(recordMutationStart),
    ]);

    expect(mutationStartTimes).toEqual([0, 1_000, 2_000]);
    expect(sleepDelays).toEqual([1_000, 1_000]);
    expect(maximumActiveMutations).toBe(1);
  });
});

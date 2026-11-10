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

export type GitHubMutationPacer = {
  readonly run: <valueType>(mutation: () => Promise<valueType>) => Promise<valueType>;
};

export const githubMutationMinimumIntervalMilliseconds = 1_000;

export type CreateGitHubMutationPacerOptions = {
  readonly currentTimeMilliseconds: () => number;
  readonly minimumIntervalMilliseconds: number;
  readonly sleep: (delayMilliseconds: number) => Promise<void>;
};

export function createGitHubMutationPacer(
  createGitHubMutationPacerOptions: CreateGitHubMutationPacerOptions,
): GitHubMutationPacer {
  const {currentTimeMilliseconds, minimumIntervalMilliseconds, sleep} = createGitHubMutationPacerOptions;
  let nextMutationStartAtMilliseconds = 0;
  let queuedMutations: Promise<void> = Promise.resolve();

  return {
    async run<valueType>(mutation: () => Promise<valueType>): Promise<valueType> {
      const previousMutation = queuedMutations;
      const currentMutation = Promise.withResolvers<void>();
      queuedMutations = currentMutation.promise;

      await previousMutation;

      try {
        const currentTime = currentTimeMilliseconds();
        const delayMilliseconds = Math.max(0, nextMutationStartAtMilliseconds - currentTime);
        if (delayMilliseconds > 0) {
          await sleep(delayMilliseconds);
        }

        nextMutationStartAtMilliseconds = currentTimeMilliseconds() + minimumIntervalMilliseconds;
        return await mutation();
      } finally {
        currentMutation.resolve();
      }
    },
  };
}

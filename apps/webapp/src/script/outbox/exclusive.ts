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

export type Exclusive = {
  /** Runs the task after every task given before it; the task must not reject */
  run: <Result>(task: () => Promise<Result>) => Promise<Result>;
  /** Resolves once every task given so far has finished */
  whenIdle: () => Promise<void>;
};

export function createExclusive(): Exclusive {
  let tail: Promise<unknown> = Promise.resolve();

  return {
    run(task) {
      const result = tail.then(task);
      tail = result.then(
        () => {
          return undefined;
        },
        () => {
          return undefined;
        },
      );
      return result;
    },
    async whenIdle() {
      await tail;
    },
  };
}

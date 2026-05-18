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

export type FireAndForgetInvokerDependencies = {
  readonly logger: {
    error: (message: string, error?: unknown) => void;
  };
};

export type FireAndForgetInvoker = {
  fireAndForget: (asyncAction: () => Promise<unknown>) => void;
  waitUntilAllSettled: () => Promise<void>;
};

export function createFireAndForgetInvoker(dependencies: FireAndForgetInvokerDependencies): FireAndForgetInvoker {
  const {logger} = dependencies;
  const activePromises = new Set<Promise<unknown>>();
  const fireAndForgetErrorMessage = 'failed to execute fire-and-forget action';

  async function observePromise(trackedPromise: Promise<unknown>): Promise<void> {
    try {
      await trackedPromise;
    } catch (error: unknown) {
      logger.error(fireAndForgetErrorMessage, error);
    } finally {
      activePromises.delete(trackedPromise);
    }
  }

  function logUnexpectedObservationError(error: unknown): void {
    logger.error(fireAndForgetErrorMessage, error);
  }

  function trackPromise(trackedPromise: Promise<unknown>): void {
    activePromises.add(trackedPromise);
    observePromise(trackedPromise).catch(logUnexpectedObservationError);
  }

  function fireAndForget(asyncAction: () => Promise<unknown>): void {
    try {
      const trackedPromise = asyncAction();
      trackPromise(trackedPromise);
    } catch (error: unknown) {
      logger.error(fireAndForgetErrorMessage, error);
    }
  }

  async function waitUntilAllSettled(): Promise<void> {
    await Promise.allSettled(Array.from(activePromises));
  }

  return {
    fireAndForget,
    waitUntilAllSettled,
  };
}

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
 */

import type {Page, Response, Route} from '@playwright/test';

type HeldMeetingCreationRequest = {
  getRequestCount: () => number;
  release: () => Promise<Response>;
  dispose: () => Promise<void>;
};

export const holdMeetingCreationRequest = async (page: Page): Promise<HeldMeetingCreationRequest> => {
  const creationUrl = /\/meetings\/?(?:\?.*)?$/;
  const gate = Promise.withResolvers<void>();
  const pendingRequests: Promise<void>[] = [];

  let requestCount = 0;

  const handler = (route: Route): Promise<void> => {
    if (route.request().method() !== 'POST') {
      return route.continue();
    }

    requestCount += 1;

    const pendingRequest = gate.promise.then(() => {
      return route.continue();
    });

    pendingRequests.push(pendingRequest);
    return pendingRequest;
  };

  await page.route(creationUrl, handler);

  return {
    getRequestCount: (): number => {
      return requestCount;
    },

    release: (): Promise<Response> => {
      const response = page.waitForResponse(candidate => {
        return candidate.request().method() === 'POST' && creationUrl.test(candidate.url());
      });

      gate.resolve();
      return response;
    },

    dispose: async (): Promise<void> => {
      gate.resolve();
      await page.unroute(creationUrl, handler);
      await Promise.all(pendingRequests);
    },
  };
};

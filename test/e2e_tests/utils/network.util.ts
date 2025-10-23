/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {PageManager} from '../pageManager';

/**
 * Sets the network conditions to offline for the given PageManager.
 * This simulates a network outage, making the page unable to access the internet.
 * @param pageManager
 */
export const makeNetworkOffline = async (pageManager: PageManager) => {
  const cdpSession = await pageManager.getContext().newCDPSession(await pageManager.getPage());
  await cdpSession.send('Network.emulateNetworkConditions', {
    offline: true,
    latency: 0,
    downloadThroughput: 0,
    uploadThroughput: 0,
  });
};

/**
 * Sets the network conditions to online for the given PageManager.
 * This restores normal network access, allowing the page to connect to the internet.
 * @param pageManager
 */
export const makeNetworkOnline = async (pageManager: PageManager) => {
  const cdpSession = await pageManager.getContext().newCDPSession(await pageManager.getPage());
  await cdpSession.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  });
};

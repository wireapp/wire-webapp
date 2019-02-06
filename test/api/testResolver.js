/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import dependenciesResolver from 'src/script/util/dependenciesResolver';
import dependenciesGraph from 'src/script/config/dependenciesGraph';

import BackendClient from 'src/script/service/BackendClient';

export const backendConfig = {
  environment: 'test',
  restUrl: 'http://localhost',
  websocket_url: 'wss://localhost',
};

dependenciesResolver.init(dependenciesGraph, {level: z.util.Logger.prototype.levels.OFF});

beforeEach(() => {
  // revoke cache to avoid having statefull entities between tests
  dependenciesResolver.resolve.cache = {};

  // always reinit the backend client with the test config
  const backendClient = dependenciesResolver.resolve(BackendClient);
  backendClient.setSettings(backendConfig);
});

export default dependenciesResolver.resolve;

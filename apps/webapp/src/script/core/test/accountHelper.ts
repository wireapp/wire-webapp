/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {nodePlatform} from '../../apiClient/shims/node/platform';

import type {Account as AccountType} from '../account';

const {ClientType} = require('../../apiClient/client');

const {APIClient} = require('../../apiClient/apiClient');
const {Account} = require('..');

const StoreHelper = require('./storeHelper');

module.exports = {
  getAccount: async function (email: string, password: string): Promise<AccountType> {
    const login = {
      clientType: ClientType.TEMPORARY,
      email,
      password,
    };
    const backend = APIClient.BACKEND.STAGING;
    const engine = await StoreHelper.createMemoryEngine(email);
    const apiClient = new APIClient({platform: nodePlatform, store: engine, urls: backend});
    const account = new Account(apiClient);
    await account.login(login);
    await account.listen();
    return account;
  },
};

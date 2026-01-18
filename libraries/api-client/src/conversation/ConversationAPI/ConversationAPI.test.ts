/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {AxiosResponse} from 'axios';

import {randomUUID} from 'crypto';

import {ConversationAPI} from './ConversationAPI';

import {AccessTokenStore} from '../../auth';
import {HttpClient} from '../../http';

const domain = 'https://test.zinfra.io';
const testConfig = {urls: {rest: domain, ws: '', name: 'test'}};
const mockedAccessTokenStore: Partial<AccessTokenStore> = {
  accessToken: {
    access_token: 'test',
    expires_in: 900,
    token_type: 'Bearer',
    user: 'aaf9a833-ef30-4c22-86a0-9adc8a15b3b4',
  },
};

const client = new HttpClient(testConfig, mockedAccessTokenStore as AccessTokenStore);

jest.spyOn(client, 'sendJSON').mockImplementation(() =>
  Promise.resolve<AxiosResponse>({
    status: 200,
    data: {},
  } as AxiosResponse),
);

const conversationApi = new ConversationAPI(client, {
  domain,
  version: 5,
  federationEndpoints: true,
  isFederated: true,
  supportsGuestLinksWithPassword: true,
  supportsMLS: true,
});

const generateQualifiedId = () => ({domain, id: randomUUID()});

describe('ConversationAPI', () => {
  describe('getConversationList', () => {
    it('returns a full list of conversations', async () => {
      const allIds = Array.from({length: 10}, generateQualifiedId);
      jest.spyOn(conversationApi, 'getQualifiedConversationIds').mockResolvedValueOnce(allIds);
      jest.spyOn(conversationApi, 'getConversationsByQualifiedIds');

      await conversationApi.getConversationList();

      expect(conversationApi.getConversationsByQualifiedIds).toHaveBeenCalledWith(allIds);
    });

    it('filters out conversation ids that should be skipped', async () => {
      const idsToSkip = [generateQualifiedId(), generateQualifiedId()];
      const ids = Array.from({length: 10}, generateQualifiedId);
      const allIds = [...idsToSkip, ...ids];
      jest.spyOn(conversationApi, 'getQualifiedConversationIds').mockResolvedValueOnce(allIds);
      jest.spyOn(conversationApi, 'getConversationsByQualifiedIds');

      await conversationApi.getConversationList(idsToSkip);

      expect(conversationApi.getConversationsByQualifiedIds).toHaveBeenCalledWith(ids);
    });
  });
});

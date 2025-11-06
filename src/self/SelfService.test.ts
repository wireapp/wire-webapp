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

import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';

import {APIClient} from '@wireapp/api-client';

import {SelfService} from './SelfService';

const BASE_URL = 'mock-backend.wire.com';
const MOCK_BACKEND = {
  name: 'mock',
  rest: `https://${BASE_URL}`,
  ws: `wss://${BASE_URL}`,
};

describe('SelfService', () => {
  describe('putSupportedProtocols', () => {
    const apiClient = new APIClient({urls: MOCK_BACKEND});
    apiClient.backendFeatures.supportsMLS = true;

    afterAll(() => {
      apiClient.disconnect();
    });

    it('updates the list of self supported protocols', async () => {
      const selfService = new SelfService(apiClient);

      const supportedProtocols = [CONVERSATION_PROTOCOL.PROTEUS, CONVERSATION_PROTOCOL.MLS];

      jest.spyOn(apiClient.api.self, 'putSupportedProtocols').mockImplementation(jest.fn());

      await selfService.putSupportedProtocols(supportedProtocols);

      expect(apiClient.api.self.putSupportedProtocols).toHaveBeenCalledWith(supportedProtocols);
    });

    it('throws if supported protocols list is not provided', async () => {
      const selfService = new SelfService(apiClient);

      const supportedProtocols = undefined as any;

      jest.spyOn(apiClient.api.self, 'putSupportedProtocols').mockImplementation(jest.fn());

      await expect(() => selfService.putSupportedProtocols(supportedProtocols)).rejects.toThrow(
        'Supported protocols must be a non-empty protocols list',
      );
    });

    it('throws if supported protocols list is empty', async () => {
      const selfService = new SelfService(apiClient);

      const supportedProtocols: CONVERSATION_PROTOCOL[] = [];

      jest.spyOn(apiClient.api.self, 'putSupportedProtocols').mockImplementation(jest.fn());

      await expect(() => selfService.putSupportedProtocols(supportedProtocols)).rejects.toThrow(
        'Supported protocols must be a non-empty protocols list',
      );
    });
  });
});

/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import {HttpClient} from '../http';
import {ConversationAPI} from './ConversationAPI';

const httpClientMock = jasmine.createSpyObj('httpClient', {sendJSON: () => ({data: ''})});

describe('ConversationAPI', () => {
  const conversationApi = new ConversationAPI(httpClientMock as HttpClient, {
    federationEndpoints: false,
    isFederated: false,
  });
  describe('postORTMessage', () => {
    it('add ignore_missing and report_missing parameters', async () => {
      await conversationApi.postOTRMessage('client-id', 'conv-id', undefined, false);
      expect(httpClientMock.sendJSON).toHaveBeenCalledWith(
        jasmine.objectContaining({
          params: {ignore_missing: false},
        }),
        true,
      );

      await conversationApi.postOTRMessage('client-id', 'conv-id', undefined, true);
      expect(httpClientMock.sendJSON).toHaveBeenCalledWith(
        jasmine.objectContaining({params: {ignore_missing: true}}),
        true,
      );

      await conversationApi.postOTRMessage('client-id', 'conv-id', undefined, ['user1', 'user2']);
      expect(httpClientMock.sendJSON).toHaveBeenCalledWith(
        jasmine.objectContaining({
          params: {ignore_missing: 'user1,user2'},
        }),
        true,
      );
    });
  });
});

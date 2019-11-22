/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

const {BackendErrorMapper} = require('@wireapp/api-client/dist/http/');
const {ConversationIsUnknownError} = require('@wireapp/api-client/dist/conversation/');
const {UserIsUnknownError} = require('@wireapp/api-client/dist/user/');

describe('BackendErrorMapper', () => {
  describe('"map"', () => {
    it('maps backend error payloads into error objects', () => {
      const userIdError = {
        code: 400,
        label: 'client-error',
        message: "[path] 'usr' invalid: Failed reading: Invalid UUID",
      };

      const userError = BackendErrorMapper.map(userIdError);
      expect(userError).toEqual(jasmine.any(UserIsUnknownError));

      const conversationIdError = {
        code: 400,
        label: 'client-error',
        message: "[path] 'cnv' invalid: Failed reading: Invalid UUID",
      };

      const conversationError = BackendErrorMapper.map(conversationIdError);
      expect(conversationError).toEqual(jasmine.any(ConversationIsUnknownError));
    });
  });
});

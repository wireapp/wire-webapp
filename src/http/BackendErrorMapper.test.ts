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

import {BackendErrorLabel} from './BackendErrorLabel';
import {BackendErrorMapper} from './BackendErrorMapper';

import {ConversationIsUnknownError} from '../conversation/ConversationError';
import {UserIsUnknownError} from '../user/UserError';

import {StatusCode} from '.';

describe('BackendErrorMapper', () => {
  describe('"map"', () => {
    it('maps backend error payloads into error objects', () => {
      const userIdError = {
        code: StatusCode.BAD_REQUEST,
        label: BackendErrorLabel.CLIENT_ERROR,
        message: "[path] 'usr' invalid: Failed reading: Invalid UUID",
        name: '',
      };

      const userError = BackendErrorMapper.map(userIdError);
      expect(userError).toEqual(expect.any(UserIsUnknownError));

      const conversationIdError = {
        code: StatusCode.BAD_REQUEST,
        label: BackendErrorLabel.CLIENT_ERROR,
        message: "[path] 'cnv' invalid: Failed reading: Invalid UUID",
        name: '',
      };

      const conversationError = BackendErrorMapper.map(conversationIdError);
      expect(conversationError).toEqual(expect.any(ConversationIsUnknownError));
    });
  });
});

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

import {type Translate} from 'Util/localizerUtil';

import {SystemMessage} from './systemMessage';

import {SystemMessageType} from '../../../message/systemMessageType';

export const createSessionResetMessage = (translate: Translate): SystemMessage => {
  const message = new SystemMessage(translate);
  message.system_message_type = SystemMessageType.SESSION_RESET;
  // The sender is resolved after mapping the event, so determine the caption when it is read.
  Object.defineProperty(message, 'caption', {
    get: () => translate(message.user().isMe ? 'sessionResetSelf' : 'sessionReset'),
    enumerable: true,
    configurable: true,
  });
  return message;
};

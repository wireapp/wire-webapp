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

import ko from 'knockout';
import TestPage from 'Util/test/TestPage';
import {CallingTimeoutMessage as CallTimeoutMessageEntity} from 'src/script/entity/message/CallingTimeoutMessage';
import CallTimeoutMessage, {CallTimeoutMessageProps} from './CallTimeoutMessage';
import {REASON} from '@wireapp/avs';

class CallTimeoutMessagePage extends TestPage<CallTimeoutMessageProps> {
  constructor(props?: CallTimeoutMessageProps) {
    super(CallTimeoutMessage, props);
  }

  getCallTimeoutMessage = (reason: REASON.NOONE_JOINED | REASON.EVERYONE_LEFT) =>
    this.get(
      `[data-uie-name="element-message-call"][data-uie-value="${
        reason === REASON.NOONE_JOINED ? 'no-one-joined' : 'everyone-left'
      }"]`,
    );
}

const createCallTimeoutMessage = (partialCallTimeoutMessage: Partial<CallTimeoutMessageEntity>) => {
  const callMessage: Partial<CallTimeoutMessageEntity> = {
    displayTimestampLong: () => '',
    displayTimestampShort: () => '',
    timestamp: ko.observable(Date.now()),
    unsafeSenderName: ko.pureComputed(() => ''),
    ...partialCallTimeoutMessage,
  };
  return callMessage as CallTimeoutMessageEntity;
};

describe('CallTimeoutMessage', () => {
  it('shows that nobody joined', async () => {
    const callMessagePage = new CallTimeoutMessagePage({
      message: createCallTimeoutMessage({
        reason: REASON.NOONE_JOINED,
      }),
    });

    expect(callMessagePage.getCallTimeoutMessage(REASON.NOONE_JOINED).exists()).toBe(true);
  });

  it('shows that all participants left', async () => {
    const callMessagePage = new CallTimeoutMessagePage({
      message: createCallTimeoutMessage({
        reason: REASON.EVERYONE_LEFT,
      }),
    });

    expect(callMessagePage.getCallTimeoutMessage(REASON.EVERYONE_LEFT).exists()).toBe(true);
  });
});

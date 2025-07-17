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

import {render} from '@testing-library/react';
import ko from 'knockout';

import {REASON} from '@wireapp/avs';

import {CallingTimeoutMessage as CallTimeoutMessageEntity} from 'Repositories/entity/message/CallingTimeoutMessage';

import {CallTimeoutMessage} from './CallTimeoutMessage';

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
    const message = createCallTimeoutMessage({
      reason: REASON.NOONE_JOINED,
    });

    const {getByTestId} = render(<CallTimeoutMessage message={message} />);

    const elementMessageCall = getByTestId('element-message-call');
    expect(elementMessageCall.getAttribute('data-uie-value')).toEqual('no-one-joined');
  });

  it('shows that all participants left', async () => {
    const message = createCallTimeoutMessage({
      reason: REASON.EVERYONE_LEFT,
    });

    const {getByTestId} = render(<CallTimeoutMessage message={message} />);

    const elementMessageCall = getByTestId('element-message-call');
    expect(elementMessageCall.getAttribute('data-uie-value')).toEqual('everyone-left');
  });
});

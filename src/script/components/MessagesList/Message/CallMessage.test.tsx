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
import {CallMessage as CallMessageEntity} from 'src/script/entity/message/CallMessage';
import CallMessage from './CallMessage';
import {render} from '@testing-library/react';

const createCallMessage = (partialCallMessage: Partial<CallMessageEntity>) => {
  const callMessage: Partial<CallMessageEntity> = {
    caption: ko.pureComputed(() => ''),
    displayTimestampLong: () => '',
    displayTimestampShort: () => '',
    timestamp: ko.observable(Date.now()),
    unsafeSenderName: ko.pureComputed(() => ''),
    ...partialCallMessage,
  };
  return callMessage as CallMessageEntity;
};

describe('CallMessage', () => {
  it('shows green pickup icon for completed calls', async () => {
    const props = {
      message: createCallMessage({
        wasCompleted: () => true,
      }),
    };

    const {getByTestId, queryByTestId} = render(<CallMessage {...props} />);

    const elementMessageCall = getByTestId('element-message-call');
    expect(elementMessageCall.getAttribute('data-uie-value')).toEqual('completed');

    expect(queryByTestId('hangup-icon')).toBeNull();
    expect(queryByTestId('pickup-icon')).not.toBeNull();
  });

  it('shows red hangup icon for incompleted calls', async () => {
    const props = {
      message: createCallMessage({
        wasCompleted: () => false,
      }),
    };

    const {getByTestId, queryByTestId} = render(<CallMessage {...props} />);

    const elementMessageCall = getByTestId('element-message-call');
    expect(elementMessageCall.getAttribute('data-uie-value')).toEqual('not_completed');

    expect(queryByTestId('pickup-icon')).toBeNull();
    expect(queryByTestId('hangup-icon')).not.toBeNull();
  });
});

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
import {CompositeMessage} from 'Repositories/entity/message/CompositeMessage';

import {MessageButton} from './MessageButton';

import {withTheme} from '../../../../../../auth/util/test/TestUtil';

describe('MessageButton', () => {
  it('shows error message', async () => {
    const messageId = 'id';
    const messageError = 'error';
    const message: Partial<CompositeMessage> = {
      errorButtonId: ko.observable<string | undefined>(messageId),
      errorMessage: ko.observable(messageError),
      selectedButtonId: ko.observable<string | undefined>(''),
      waitingButtonId: ko.observable<string | undefined>(''),
    };

    const props = {
      id: messageId,
      label: 'buttonLabel',
      message: message as CompositeMessage,
    };

    const {queryByText} = render(withTheme(<MessageButton {...props} />));
    expect(queryByText(messageError)).not.toBeNull();
  });

  it('renders selected button', async () => {
    const messageId = 'id';
    const message: Partial<CompositeMessage> = {
      errorButtonId: ko.observable<string | undefined>(''),
      errorMessage: ko.observable(''),
      selectedButtonId: ko.observable<string | undefined>(messageId),
      waitingButtonId: ko.observable<string | undefined>(''),
    };

    const props = {
      id: messageId,
      label: 'buttonLabel',
      message: message as CompositeMessage,
    };

    const {queryByTestId, container} = render(withTheme(<MessageButton {...props} />));

    expect(queryByTestId('message-button-error')).toBeNull();

    const selectedButton = container.querySelector(`button[data-uie-uid="${messageId}"]`);
    expect(selectedButton).not.toBeNull();

    expect(selectedButton!.getAttribute('data-uie-selected')).toBe('true');
  });
});

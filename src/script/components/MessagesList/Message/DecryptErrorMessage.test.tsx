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

import {render, fireEvent} from '@testing-library/react';
import ko from 'knockout';
import {act} from 'react-dom/test-utils';

import {DecryptErrorMessage as DecryptErrorMessageEntity} from 'src/script/entity/message/DecryptErrorMessage';
import {User} from 'src/script/entity/User';

import {DecryptErrorMessage} from './DecryptErrorMessage';

const createDecryptErrorMessage = (partialDecryptErrorMessage: Partial<DecryptErrorMessageEntity>) => {
  const decryptErrorMessage: Partial<DecryptErrorMessageEntity> = {
    user: ko.observable(new User()),
    is_recoverable: ko.pureComputed(() => false),
    is_resetting_session: ko.observable(false),
    ...partialDecryptErrorMessage,
  };
  return decryptErrorMessage as DecryptErrorMessageEntity;
};

describe('DecryptErrorMessage', () => {
  it('shows "reset session" action when error is recoverable', async () => {
    const isRecoverable = ko.observable(false);
    const props = {
      message: createDecryptErrorMessage({
        is_recoverable: ko.pureComputed(() => isRecoverable()),
      }),
      onClickResetSession: jest.fn(),
    };

    const {queryByTestId, rerender} = render(<DecryptErrorMessage {...props} />);

    expect(queryByTestId('do-reset-encryption-session')).toBeNull();

    const decryptErrorMessage = queryByTestId('element-message-decrypt-error');
    expect(decryptErrorMessage).not.toBeNull();

    act(() => {
      isRecoverable(true);
    });
    rerender(<DecryptErrorMessage {...props} />);

    expect(decryptErrorMessage).not.toBeNull();
  });

  it('shows loading spinner during session reset', async () => {
    const isResetting = ko.observable(false);

    const props = {
      message: createDecryptErrorMessage({
        is_recoverable: ko.pureComputed(() => true),
        is_resetting_session: isResetting,
      }),
      onClickResetSession: jest.fn(() => {
        isResetting(true);
      }),
    };

    const {getByTestId, queryByTestId, rerender} = render(<DecryptErrorMessage {...props} />);

    const decryptErrorMessage = queryByTestId('element-message-decrypt-error');
    expect(decryptErrorMessage).not.toBeNull();

    const resetEncryptionSessionLoadingSpinner = queryByTestId('status-loading');
    expect(resetEncryptionSessionLoadingSpinner).toBeNull();

    const resetEncryptionSessionLink = getByTestId('do-reset-encryption-session');

    act(() => {
      fireEvent.click(resetEncryptionSessionLink);
    });

    expect(props.onClickResetSession).toHaveBeenCalled();

    expect(queryByTestId('do-reset-encryption-session')).toBeNull();
    expect(queryByTestId('status-loading')).not.toBeNull();

    act(() => {
      isResetting(false);
    });
    rerender(<DecryptErrorMessage {...props} />);

    expect(resetEncryptionSessionLink).not.toBeNull();
    expect(resetEncryptionSessionLoadingSpinner).toBeNull();
  });
});

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

import {fireEvent, render} from '@testing-library/react';

import {translate} from '../../util/localizerUtil';

import {JoinGuestLinkPasswordModal, JoinGuestLinkPasswordModalProps} from './joinGuestLinkPasswordModal';

import {withIntl, withTheme} from '../util/test/testUtil';

describe('JoinGuestLinkPasswordModal', () => {
  const onSubmitPasswordMock = jest.fn();
  const props: JoinGuestLinkPasswordModalProps = {
    onSubmitPassword: onSubmitPasswordMock,
    onClose: jest.fn(),
    conversationName: 'test group',
    error: null,
  };

  beforeEach(() => {
    onSubmitPasswordMock.mockClear();
  });

  it('renders a dialog and closes when its background is clicked', () => {
    const onClose = jest.fn();
    const {getByRole, getByTestId} = render(
      withTheme(withIntl(<JoinGuestLinkPasswordModal {...props} onClose={onClose} />)),
    );

    expect(getByRole('dialog')).toBeVisible();

    fireEvent.click(getByTestId('modal-background'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows and hides the password using the labelled toggle', () => {
    const {getByRole, getByTestId} = render(withTheme(withIntl(<JoinGuestLinkPasswordModal {...props} />)));
    const passwordInput = getByTestId('guest-link-join-password-input');

    fireEvent.change(passwordInput, {target: {value: 'example-password'}});
    expect(passwordInput).toHaveAttribute('type', 'password');

    fireEvent.click(getByRole('button', {name: translate('showTogglePasswordLabel')}));

    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(passwordInput).toHaveValue('example-password');

    fireEvent.click(getByRole('button', {name: translate('hideTogglePasswordLabel')}));

    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(passwordInput).toHaveValue('example-password');
  });

  it('should call onSubmitPassword with the password value when the form is submitted', () => {
    const {getByTestId} = render(withTheme(withIntl(<JoinGuestLinkPasswordModal {...props} />)));
    const input = getByTestId('guest-link-join-password-input') as HTMLInputElement;
    const joinConversationButton = getByTestId('guest-link-join-submit-button') as HTMLButtonElement;
    fireEvent.change(input, {target: {value: 'password'}});
    joinConversationButton.click();
    expect(onSubmitPasswordMock).toHaveBeenCalledWith('password');
  });

  it('should disable the join conversation button when the password input is empty', () => {
    const {getByTestId} = render(withTheme(withIntl(<JoinGuestLinkPasswordModal {...props} />)));
    const joinConversationButton = getByTestId('guest-link-join-submit-button') as HTMLButtonElement;
    expect(joinConversationButton.disabled).toBe(true);
  });

  it('should enable the join conversation button when the password input is not empty', () => {
    const {getByTestId} = render(withTheme(withIntl(<JoinGuestLinkPasswordModal {...props} />)));
    const input = getByTestId('guest-link-join-password-input');
    const joinConversationButton = getByTestId('guest-link-join-submit-button') as HTMLButtonElement;
    fireEvent.change(input, {target: {value: 'password'}});
    expect(joinConversationButton.disabled).toBe(false);
  });

  it('should not call onSubmitPassword with an empty string when the form is submitted with an empty password input', () => {
    const {getByTestId} = render(withTheme(withIntl(<JoinGuestLinkPasswordModal {...props} />)));
    const joinConversationButton = getByTestId('guest-link-join-submit-button') as HTMLButtonElement;
    joinConversationButton.click();
    expect(onSubmitPasswordMock).toHaveBeenCalledTimes(0);
  });
});
